Dưới đây là báo cáo tổng hợp theo góc nhìn tech lead, dựa trên source FE hiện tại.

**Tổng Quan**
FE CraftFlow hiện có UI khá đầy đủ, nhưng nền kỹ thuật đang thiếu ổn định: build production fail, TypeScript bị bỏ qua, API contract lỏng, permission/route phân tán, cache realtime sai key, nhiều page client quá lớn. Hiện tượng click page/login role bị compile chậm và lag là hệ quả trực tiếp của kiến trúc FE hiện tại, không chỉ do máy hoặc Next.js dev mode.

**Lỗi Blocker**
1. Production build fail  
`npm.cmd run build` fail tại `/production-management/purchase-orders` vì `useSearchParams()` không được bọc trong `Suspense`.

File: [purchase-orders/page.tsx](</e:/thien-workspace/Repo/CraftFlow/frontend/src/app/production-management/purchase-orders/page.tsx:83>)

Cách fix:
- Tách phần dùng `useSearchParams()` thành client component con.
- Bọc component đó bằng `<Suspense fallback={...}>`.
- Hoặc chuyển logic đọc query param sang `searchParams` prop ở server page nếu phù hợp.

2. TypeScript errors đang bị che  
[next.config.mjs](</e:/thien-workspace/Repo/CraftFlow/frontend/next.config.mjs:6>) có:

```ts
typescript: {
  ignoreBuildErrors: true,
}
```

Khi chạy `tsc --noEmit`, có lỗi thật ở inventory, products, dashboard stats, production orders.

Cách fix:
- Thêm script `"type-check": "tsc --noEmit"`.
- Fix từng lỗi type.
- Sau đó bỏ `ignoreBuildErrors`.

**Lỗi Data Logic**
1. API response shape không thống nhất  
Nhiều nơi đọc fallback kiểu:

```ts
data.items || data.orders || data.data
```

Ví dụ [use-production-orders.ts](</e:/thien-workspace/Repo/CraftFlow/frontend/src/features/production/hooks/use-production-orders.ts:45>).

Rủi ro:
- FE có thể render sai nếu backend đổi shape.
- Lỗi contract bị giấu.
- Dữ liệu kho/sản xuất có thể hiển thị stale hoặc sai.

Cách fix:
- Tạo adapter normalize response theo từng module.
- Page/hook chỉ đọc một shape duy nhất.
- Không dùng fallback tùy tiện ở UI layer.

2. Quá nhiều `any`  
Source hiện có khoảng **344 chỗ `any`**.

Rủi ro:
- TypeScript gần như mất tác dụng.
- Payload mutation PO, inventory, production order không được bảo vệ.
- Dễ gửi sai field làm hỏng nghiệp vụ.

Cách fix:
- Ưu tiên type cho các module rủi ro cao: `purchaseOrder`, `production`, `inventory`, `slip`.
- Tạo DTO riêng: `CreatePurchaseOrderPayload`, `ProductionOrderResponse`, `InventoryStockItem`.

3. Inventory stats có thể sai  
[use-inventory-materials.ts](</e:/thien-workspace/Repo/CraftFlow/frontend/src/features/inventory/hooks/use-inventory-materials.ts:17>) tính total bằng `materials.length`.

Rủi ro:
- Nếu API phân trang, tổng tồn kho/alert chỉ là tổng của page hiện tại.

Cách fix:
- Lấy `pagination.total` từ API cho tổng record.
- Stats nghiệp vụ nên lấy từ endpoint overview hoặc backend aggregate, không tính từ list page.

**Lỗi Cache Và Realtime**
1. Socket invalidate sai query key  
[use-socket.tsx](</e:/thien-workspace/Repo/CraftFlow/frontend/src/hooks/use-socket.tsx:81>) invalidate:

```ts
['production-orders']
```

Trong khi hook production dùng `productionKeys.all` là:

```ts
['production']
```

Rủi ro:
- Socket nhận event nhưng UI không refetch.
- User tưởng dữ liệu realtime, nhưng thực tế đang stale.

Cách fix:
- Tạo centralized query keys.
- Socket chỉ dùng key registry, không dùng string rời.
- Ví dụ: `queryClient.invalidateQueries({ queryKey: productionKeys.all })`.

2. `window.location.href` gây reload cứng  
[axios.ts](</e:/thien-workspace/Repo/CraftFlow/frontend/src/lib/axios.ts:48>) redirect 401 bằng hard reload.

Rủi ro:
- Mất React Query state.
- Mất pending UI state.
- Login/logout bị cảm giác giật.

Cách fix:
- Không redirect trong axios interceptor.
- Emit auth error qua event/store.
- AuthProvider xử lý redirect bằng `router.replace("/")`.

**Lỗi Permission/Role**
Permission đang bị hard-code ở nhiều nơi:
- [app-shell.tsx](</e:/thien-workspace/Repo/CraftFlow/frontend/src/components/app-shell.tsx:27>)
- [app-sidebar.tsx](</e:/thien-workspace/Repo/CraftFlow/frontend/src/components/app-sidebar.tsx:50>)
- `withPermission(...)` trong một số page.

Rủi ro:
- Sidebar hiển thị route nhưng AppShell lại redirect.
- Thêm role/page mới dễ sót rule.
- Login role mới bị redirect vòng hoặc render chậm.

Cách fix:
- Tạo `routeAccessConfig`.
- Sidebar, AppShell, guard cùng đọc một config.
- Mỗi route khai báo: path, roles, defaultRedirect, nav metadata.

**Lỗi Gây Compile Chậm Và Lag**
1. Dev script đang ép Webpack  
[package.json](</e:/thien-workspace/Repo/CraftFlow/frontend/package.json:6>) hiện là:

```json
"dev": "next dev --webpack"
```

Với Next `16.2.0`, ép Webpack khiến dev compile chậm hơn.

Cách fix nhanh nhất:

```json
"dev": "next dev --turbopack"
```

hoặc:

```json
"dev": "next dev"
```

2. Quá nhiều page là Client Component  
Có **45/50 page.tsx** dùng `"use client"`.

Rủi ro:
- Mỗi route thành client bundle lớn.
- Lần đầu click route nào Next phải compile route đó.
- Hydration nặng, UI đứng lâu.

Cách fix:
- Page chỉ nên là server wrapper khi có thể.
- Tách phần cần state thành client component nhỏ.
- Không đặt `"use client"` ở page nếu chỉ để bọc layout.

3. Page quá lớn  
Các page nặng nhất:
- `users/page.tsx`: khoảng 787 dòng
- `production-management/purchase-orders/page.tsx`: khoảng 732 dòng
- `inventory/stocktake/page.tsx`: khoảng 689 dòng
- `defects/scrap/page.tsx`: khoảng 673 dòng
- `issuing/pick-list/page.tsx`: khoảng 661 dòng

Rủi ro:
- Compile chậm.
- Render chậm.
- State thay đổi nhỏ làm render lại vùng lớn.
- Khó test và khó refactor.

Cách fix:
- Tách page theo: container hook, table, filters, dialogs, actions.
- Ưu tiên PO, users, stocktake trước.

4. AppShell import lại trong từng page  
Hiện mỗi page tự render `AppShell`.

Rủi ro:
- Header/sidebar/notification/chat bị mount lại khi đổi page.
- Login role mới phải render nhiều lớp global cùng lúc.

Cách fix:
- Dùng nested layouts của App Router.
- Ví dụ:
  - `/production-management/layout.tsx`
  - `/inventory/layout.tsx`
  - `/dashboard/layout.tsx`
- `AppShell` nằm trong layout, page chỉ render content.

5. Thư viện nặng import trực tiếp  
Các nhóm nặng: QR scanner, `qrcode.react`, charts/recharts, date-fns locale, socket, analytics.

Cách fix:
- Dynamic import QR scanner chỉ khi mở dialog.
- Dynamic import chart theo tab/page.
- Không import chart/QR ở page root nếu chưa dùng ngay.

**Kế Hoạch Fix Thực Tế**
Pha 1: 1 ngày  
- Đổi dev script sang Turbopack.
- Fix build blocker `useSearchParams`.
- Thêm `type-check`.
- Chạy `npm.cmd run build` và `npm.cmd run type-check`.

Pha 2: 2-3 ngày  
- Sửa query keys/socket invalidation.
- Tách axios auth redirect khỏi interceptor.
- Tạo query key registry.
- Chuẩn hóa response adapter cho production, purchase order, inventory.

Pha 3: 3-5 ngày  
- Refactor `purchase-orders/page.tsx`.
- Tách thành hook + table + detail dialog + create dialog.
- Giữ nguyên className/UI để không ảnh hưởng giao diện.
- Thêm loading skeleton và disable submit đúng chỗ.

Pha 4: 3-5 ngày  
- Đưa `AppShell` vào nested layouts theo role/module.
- Tạo `routeAccessConfig`.
- Sidebar và guard dùng chung config.

Pha 5: liên tục  
- Giảm `"use client"` ở page.
- Loại dần `any`.
- Thêm smoke tests cho login, role redirect, create PO, approve PO, inventory view.

**Ưu Tiên Cao Nhất**
1. Đổi `next dev --webpack` sang `next dev --turbopack`.
2. Fix build fail ở purchase orders.
3. Bỏ dần `ignoreBuildErrors`.
4. Sửa socket query key sai.
5. Refactor PO page vì đây là điểm vừa nặng, vừa rủi ro dữ liệu cao nhất.

Kết luận: vấn đề lag không phải một bug đơn lẻ. Nó đến từ kiến trúc hiện tại: quá nhiều client page lớn, layout chưa tận dụng App Router, dev server bị ép Webpack, và data layer thiếu chuẩn hóa. Fix đúng hướng là siết build/type/cache trước, sau đó refactor từng cụm page nặng mà vẫn giữ nguyên UI.