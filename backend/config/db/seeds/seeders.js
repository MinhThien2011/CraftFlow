import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { ROLES } from "../../../utils/constants.js";
import Role from "../../../models/Roles.js";
import User from "../../../models/User.js";
import Material from "../../../models/Material.js";
import Product from "../../../models/Product.js";
import Shelf from "../../../models/Shelf.js";
import Bom from "../../../models/BOM.js";
import ProductionOrder from "../../../models/ProductionOrder.js";
import ProductionOrderAssignment from "../../../models/ProductionOrderAssignment.js";
import InventoryBatch from "../../../models/InventoryBatch.js";
import InventoryTransaction from "../../../models/InventoryTransaction.js";
import ProductExportRequest from "../../../models/ProductExportRequest.js";
import InventoryImportExportSlip from "../../../models/InventoryImportExportSlip.js";
import MaterialAlert from "../../../models/MaterialAlert.js";
import MaterialRequisition from "../../../models/MaterialRequisition.js";
import {
    ORDER_STATUS,
    TRANSACTION_TYPE,
    INVENTORY_IMPORT_EXPORT_SLIP_TYPE,
    INVENTORY_IMPORT_EXPORT_SLIP_STATUS,
    REQUISITION_STATUS,
    REQUISITION_TYPE
} from "../../../utils/constants.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SEEDS_DIR = path.join(__dirname, "..", "..", "..", "seeds");

const readSeedFile = (filename) => {
    const filepath = path.join(SEEDS_DIR, filename);
    if (!fs.existsSync(filepath)) throw new Error(`Seed file not found: ${filepath}`);
    return JSON.parse(fs.readFileSync(filepath, "utf8"));
};

const buildMap = (docs, keyFn, valFn = (d) => d._id) =>
    docs.reduce((acc, d) => { acc[keyFn(d)] = valFn(d); return acc; }, {});

const splitStockAcrossBatches = (total) => {
    const n = Math.max(0, Number(total || 0));
    if (n <= 0) return [];
    if (n < 3) return [n];
    if (n < 8) return [Math.max(1, n - 1), 1];
    const first = Math.max(1, Math.floor(n * 0.45));
    const second = Math.max(1, Math.floor(n * 0.35));
    const third = n - first - second;
    return third > 0 ? [first, second, third] : [first, n - first];
};

export const seedRoles = async () => {
    if (await Role.countDocuments()) return;

    const docs = Object.values(ROLES).map((roleName) => ({ roleName }));
    await Role.insertMany(docs);
    console.log(`[OK] Seeded ${docs.length} roles`);
};

export const seedUsers = async () => {
    if (await User.countDocuments()) return;

    const data = readSeedFile("userSeed.json");
    const roles = await Role.find({}).lean();
    const roleMap = buildMap(roles, (r) => r.roleName);

    const docs = data.map((u) => {
        const roleName = u.role === "user" ? ROLES.STAFF : u.role;
        return { ...u, role: roleMap[roleName] ?? roleMap[ROLES.STAFF] };
    });

    await User.create(docs);
    console.log(`[OK] Seeded ${docs.length} users`);
};

export const seedShelves = async () => {
    if (await Shelf.countDocuments()) return;

    const data = readSeedFile("shelfSeed.json");
    await Shelf.insertMany(data);
    console.log(`[OK] Seeded ${data.length} shelves`);
};

export const seedMaterials = async () => {
    if (await Material.countDocuments()) return;

    const data = readSeedFile("materialSeed.json");
    const shelves = await Shelf.find({}).lean();
    const shelfMap = buildMap(shelves, (s) => s.shelfCode.toUpperCase());

    const docs = data.map((m) => {
        const shelfId = shelfMap[m.location.toUpperCase()];
        if (!shelfId) throw new Error(`Shelf "${m.location}" not found for material "${m.code}"`);
        return { ...m, shelf: shelfId };
    });

    const createdMaterials = await Material.insertMany(docs);
    console.log(`[OK] Seeded ${createdMaterials.length} materials`);

    // Create multiple initial batches for clearer FIFO testing
    const batchDocs = [];
    createdMaterials
        .filter((m) => m.currentStock > 0)
        .forEach((m) => {
            const splits = splitStockAcrossBatches(m.currentStock);
            splits.forEach((qty, idx) => {
                const daysAgo = (splits.length - idx) * 12;
                batchDocs.push({
                    batchNumber: `BATCH-${m.code}-S${String(idx + 1).padStart(2, '0')}`,
                    material: m._id,
                    quantityReceived: qty,
                    quantityRemaining: qty,
                    unit: m.unit,
                    unitCost: m.price,
                    receivedDate: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
                    shelf: m.shelf,
                    isExhausted: false
                });
            });
        });

    if (batchDocs.length > 0) {
        await InventoryBatch.insertMany(batchDocs);
        console.log(`[OK] Seeded ${batchDocs.length} initial material batches`);
    }
};

export const seedProducts = async () => {
    if (await Product.countDocuments()) return;

    const data = readSeedFile("productSeed.json");
    const materials = await Material.find({ isActive: true }).lean();
    const matMap = buildMap(materials, (m) => m.code, (m) => m);
    const shelves = await Shelf.find({}).lean();
    const shelfMap = buildMap(shelves, (s) => s.shelfCode.toUpperCase());

    const docs = data.map((product) => {
        const estimateMaterialCost = product.estimateMaterialCost
            .map((item) => {
                const mat = matMap[item.materialCode];
                if (!mat) {
                    console.warn(`[WARN] Material "${item.materialCode}" not found for product "${product.name}"`);
                    return null;
                }
                return {
                    material: mat._id,
                    materialCode: mat.code,
                    materialName: mat.name,
                    quantity: item.quantity,
                    unit: mat.unit,
                    priceAtTime: mat.price,
                };
            })
            .filter(Boolean);

        const baseCost = estimateMaterialCost.reduce(
            (sum, i) => sum + i.quantity * i.priceAtTime, 0
        );

        const shelfId = shelfMap[product.location.toUpperCase()];
        if (!shelfId) throw new Error(`Shelf "${product.location}" not found for product "${product.code}"`);

        return { ...product, estimateMaterialCost, baseCost, shelf: shelfId };
    });

    const createdProducts = await Product.insertMany(docs);
    console.log(`[OK] Seeded ${createdProducts.length} products`);

    // Create multiple initial batches for clearer FIFO testing
    const batchDocs = [];
    createdProducts
        .filter((p) => p.currentStock > 0)
        .forEach((p) => {
            const splits = splitStockAcrossBatches(p.currentStock);
            splits.forEach((qty, idx) => {
                const daysAgo = (splits.length - idx) * 10;
                batchDocs.push({
                    batchNumber: `BATCH-${p.code}-S${String(idx + 1).padStart(2, '0')}`,
                    product: p._id,
                    quantityReceived: qty,
                    quantityRemaining: qty,
                    unit: p.unit,
                    unitCost: p.baseCost || 0,
                    receivedDate: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
                    shelf: p.shelf,
                    isExhausted: false
                });
            });
        });

    if (batchDocs.length > 0) {
        await InventoryBatch.insertMany(batchDocs);
        console.log(`[OK] Seeded ${batchDocs.length} initial product batches`);
    }
};

export const seedProductionOrders = async () => {
    if (await ProductionOrder.countDocuments()) return;

    const data = readSeedFile("productionOrderSeed.json");
    const products = await Product.find({}).lean();
    const productMap = buildMap(products, (p) => p.code, (p) => p);
    const users = await User.find({}).lean();
    const userMap = buildMap(users, (u) => u.username);

    const docs = data
        .map((order) => {
            const product = productMap[order.productCode];
            if (!product || !userMap[order.createdByUsername]) return null;
            const materials = (product.estimateMaterialCost || []).map((m) => ({
                material: m.material,
                plannedQuantity: Number(m.quantity || 0) * Number(order.quantity || 0),
                issuedQuantity: 0,
                returnedQuantity: 0,
                unit: m.unit || "unit",
            }));

            return {
                ...order,
                products: [{
                    product: product._id,
                    quantity: order.quantity,
                    productName: product.name,
                    productCode: product.code,
                }],
                materials,
                createdBy: userMap[order.createdByUsername],
                completedAt: order.status === ORDER_STATUS.COMPLETED ? new Date() : undefined,
            };
        })
        .filter(Boolean);

    await ProductionOrder.insertMany(docs);
    console.log(`[OK] Seeded ${docs.length} production orders`);
};


export const seedProductionOrderAssignments = async () => {
    if (await ProductionOrderAssignment.countDocuments()) return;

    const staffRole = await Role.findOne({ roleName: ROLES.STAFF }).lean();
    if (!staffRole) return;

    const staffUsers = await User.find({ role: staffRole._id, isActive: true }).sort({ username: 1 }).lean();
    if (!staffUsers.length) return;

    const orders = await ProductionOrder.find({}).sort({ createdAt: 1, _id: 1 }).lean();
    const assignmentDocs = [];
    let staffCursor = 0;

    for (const order of orders) {
        const productItem = order.products?.[0];
        if (!productItem?.product) continue;
        if (![ORDER_STATUS.ASSIGNED, ORDER_STATUS.IN_PRODUCTION, ORDER_STATUS.PARTIALLY_COMPLETE, ORDER_STATUS.COMPLETED].includes(order.status)) continue;

        const assignee = staffUsers[staffCursor % staffUsers.length];
        staffCursor++;
        const assignedQty = Number(productItem.quantity || 0);
        if (assignedQty <= 0) continue;

        const completedQty = order.status === ORDER_STATUS.COMPLETED
            ? assignedQty
            : (order.status === ORDER_STATUS.IN_PRODUCTION ? Math.max(1, Math.floor(assignedQty * 0.5)) : 0);
        const status = order.status === ORDER_STATUS.COMPLETED
            ? ORDER_STATUS.COMPLETED
            : (completedQty > 0 ? ORDER_STATUS.IN_PRODUCTION : ORDER_STATUS.ASSIGNED);

        assignmentDocs.push({
            productionOrder: order._id,
            product: productItem.product,
            staff: assignee._id,
            assignedQuantity: assignedQty,
            completedQuantity: completedQty,
            status,
            startedAt: status !== ORDER_STATUS.ASSIGNED ? new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) : undefined,
            finishedAt: status === ORDER_STATUS.COMPLETED ? new Date() : undefined,
            notes: `Seed assignment for ${order.orderCode}`,
        });
    }

    if (!assignmentDocs.length) return;
    await ProductionOrderAssignment.insertMany(assignmentDocs);
    console.log(`Seeded ${assignmentDocs.length} production order assignments`);
};

export const seedMaterialRequisitions = async () => {
    if (await MaterialRequisition.countDocuments()) return;

    const orders = await ProductionOrder.find({}).sort({ createdAt: 1, _id: 1 }).lean();
    if (!orders.length) return;

    const userDocs = await User.find({ isActive: true }).populate("role").lean();
    const productionManager = userDocs.find((u) => u.role?.roleName === ROLES.PRODUCTION_MANAGER) || userDocs[0];
    const khoManager = userDocs.find((u) => u.role?.roleName === ROLES.KHO_MANAGER) || userDocs[0];
    const adminUser = userDocs.find((u) => u.role?.roleName === ROLES.ADMIN) || userDocs[0];
    if (!productionManager || !khoManager || !adminUser) return;

    const usedCodes = new Set((await MaterialRequisition.find({}).select("requisitionCode").lean()).map((r) => r.requisitionCode));
    const reqDocs = [];
    let seq = 1;

    for (const order of orders) {
        if (![ORDER_STATUS.IN_PRODUCTION, ORDER_STATUS.COMPLETED, ORDER_STATUS.ASSIGNED].includes(order.status)) continue;
        if (!Array.isArray(order.materials) || order.materials.length === 0) continue;

        let code;
        do {
            code = `REQ-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${String(seq).padStart(4, "0")}`;
            seq++;
        } while (usedCodes.has(code));
        usedCodes.add(code);

        const completedLike = [ORDER_STATUS.IN_PRODUCTION, ORDER_STATUS.COMPLETED].includes(order.status);
        const items = order.materials
            .filter((m) => m.material && Number(m.plannedQuantity || 0) > 0)
            .map((m) => {
                const requestedQuantity = Number(m.plannedQuantity || 0);
                const actualQuantity = completedLike
                    ? (order.status === ORDER_STATUS.COMPLETED ? requestedQuantity : Math.max(1, Math.floor(requestedQuantity * 0.7)))
                    : 0;
                return {
                    material: m.material,
                    requestedQuantity,
                    actualQuantity,
                    returnedQuantity: 0,
                    batchAllocations: []
                };
            });

        if (!items.length) continue;
        reqDocs.push({
            requisitionCode: code,
            productionOrder: order._id,
            createdBy: productionManager._id,
            items,
            type: REQUISITION_TYPE.ISSUE,
            status: completedLike ? REQUISITION_STATUS.COMPLETED : REQUISITION_STATUS.PENDING,
            khoManager: khoManager._id,
            adminApprovedBy: adminUser._id,
            preparedAt: completedLike ? new Date(Date.now() - 24 * 60 * 60 * 1000) : undefined,
            completedAt: completedLike ? new Date() : undefined,
            notes: `Seed requisition for ${order.orderCode}`,
        });
    }

    if (!reqDocs.length) return;
    await MaterialRequisition.insertMany(reqDocs);
    console.log(`Seeded ${reqDocs.length} material requisitions`);
};

export const seedProductionOrderSlips = async () => {
    const existingRelated = await InventoryImportExportSlip.countDocuments({
        $or: [
            { relatedProductionOrder: { $exists: true, $ne: null } },
            { relatedRequisition: { $exists: true, $ne: null } }
        ]
    });
    if (existingRelated > 0) return;

    const requisitions = await MaterialRequisition.find({})
        .populate("productionOrder")
        .populate("items.material")
        .populate("createdBy")
        .populate("khoManager")
        .lean();
    if (!requisitions.length) return;

    const usedSlipNumbers = new Set((await InventoryImportExportSlip.find({}).select("slipNumber").lean()).map((s) => s.slipNumber));
    const slipDocs = [];
    let exportSeq = 1;
    let importSeq = 1;

    for (const req of requisitions) {
        const order = req.productionOrder;
        if (!order || !Array.isArray(req.items) || req.items.length === 0) continue;

        const baseDate = req.completedAt || req.preparedAt || req.createdAt || new Date();
        const dateTag = new Date(baseDate).toISOString().slice(0, 10).replace(/-/g, "");
        let exportNo;
        do {
            exportNo = `PXK-${dateTag}-${String(exportSeq).padStart(4, "0")}`;
            exportSeq++;
        } while (usedSlipNumbers.has(exportNo));
        usedSlipNumbers.add(exportNo);

        const exportItems = req.items
            .filter((it) => it.material)
            .map((it) => {
                const requested = Number(it.requestedQuantity || 0);
                const actual = Number(it.actualQuantity || 0);
                const unitPrice = Number(it.material?.price || 0);
                return {
                    material: it.material._id,
                    itemName: it.material.name,
                    itemCode: it.material.code,
                    unit: it.material.unit || "unit",
                    quantity: { requested, provisional: 0, actual },
                    unitPrice,
                    amount: actual * unitPrice,
                };
            });
        if (!exportItems.length) continue;

        const exportCompleted = req.status === REQUISITION_STATUS.COMPLETED;
        slipDocs.push({
            type: INVENTORY_IMPORT_EXPORT_SLIP_TYPE.EXPORT,
            slipNumber: exportNo,
            date: baseDate,
            status: exportCompleted ? INVENTORY_IMPORT_EXPORT_SLIP_STATUS.COMPLETED : INVENTORY_IMPORT_EXPORT_SLIP_STATUS.PENDING,
            personName: req.createdBy?.fullName || "Production staff",
            reason: `Xuat NVL cho ${order.orderCode} theo ${req.requisitionCode}`,
            relatedProductionOrder: order._id,
            relatedRequisition: req._id,
            items: exportItems,
            signatures: {
                creator: req.createdBy?._id || req.createdBy,
                storekeeper: req.khoManager?._id || req.khoManager,
            },
            finalizedAt: exportCompleted ? (req.completedAt || baseDate) : undefined,
        });

        if (order.status === ORDER_STATUS.COMPLETED) {
            const productItem = order.products?.[0];
            if (!productItem?.product || Number(productItem.quantity || 0) <= 0) continue;

            let importNo;
            do {
                importNo = `PNK-${dateTag}-${String(importSeq).padStart(4, "0")}`;
                importSeq++;
            } while (usedSlipNumbers.has(importNo));
            usedSlipNumbers.add(importNo);

            const importDate = new Date(new Date(baseDate).getTime() + 8 * 60 * 60 * 1000);
            slipDocs.push({
                type: INVENTORY_IMPORT_EXPORT_SLIP_TYPE.IMPORT,
                slipNumber: importNo,
                date: importDate,
                status: INVENTORY_IMPORT_EXPORT_SLIP_STATUS.IN_STOCK,
                personName: "To san xuat",
                reason: `Nhap kho thanh pham tu ${order.orderCode}`,
                relatedProductionOrder: order._id,
                items: [{
                    product: productItem.product,
                    itemName: productItem.productName,
                    itemCode: productItem.productCode,
                    unit: "cai",
                    quantity: {
                        requested: Number(productItem.quantity || 0),
                        provisional: Number(productItem.quantity || 0),
                        actual: Number(productItem.quantity || 0),
                    },
                    unitPrice: 0,
                    amount: 0,
                }],
                signatures: {
                    creator: req.createdBy?._id || req.createdBy,
                    storekeeper: req.khoManager?._id || req.khoManager,
                },
                inStockAt: importDate,
                finalizedAt: importDate,
            });
        }
    }

    if (!slipDocs.length) return;
    const createdSlips = await InventoryImportExportSlip.insertMany(slipDocs);

    const expSlipMapByReqId = new Map(createdSlips.filter((s) => s.relatedRequisition).map((s) => [String(s.relatedRequisition), s._id]));
    const reqUpdates = [];
    for (const req of requisitions) {
        const relatedSlip = expSlipMapByReqId.get(String(req._id));
        if (!relatedSlip) continue;
        reqUpdates.push({
            updateOne: {
                filter: { _id: req._id },
                update: { $set: { relatedSlip } }
            }
        });
    }
    if (reqUpdates.length > 0) {
        await MaterialRequisition.bulkWrite(reqUpdates, { ordered: false });
    }

    console.log(`Seeded ${createdSlips.length} production-related slips`);
};
export const seedBoms = async () => {
    if (await Bom.countDocuments()) return;

    const orders = await ProductionOrder.find({}).populate("products.product").lean();

    const docs = orders
        .map((order) => {
            const requirements = new Map();

            for (const { product, quantity } of order.products) {
                if (!product?.estimateMaterialCost) continue;
                for (const { material, quantity: qtyPer } of product.estimateMaterialCost) {
                    const id = material.toString();
                    requirements.set(id, (requirements.get(id) ?? 0) + qtyPer * quantity);
                }
            }

            if (!requirements.size) return null;

            return {
                productionOrder: order._id,
                version: "v1.0-seed",
                isActive: true,
                items: [...requirements.entries()].map(([material, qtyPerUnit]) => ({
                    material,
                    qtyPerUnit,
                    unit: "unit",
                    note: `Seed for order ${order.orderCode}`,
                })),
            };
        })
        .filter(Boolean);

    if (!docs.length) return;

    await Bom.insertMany(docs);
    console.log(`[OK] Seeded ${docs.length} BOMs`);
};

export const seedProductExportRequests = async () => {
    if (await ProductExportRequest.countDocuments()) return;

    const data = readSeedFile("productExportRequestSeed.json");
    const products = await Product.find({}).lean();
    const productMap = buildMap(products, (p) => p.code, (p) => p);
    const users = await User.find({}).lean();
    const userMap = buildMap(users, (u) => u.username);

    const docs = data
        .map((request) => {
            if (!userMap[request.createdByUsername]) {
                console.warn(`[WARN] Creator "${request.createdByUsername}" not found for request "${request.requestCode}"`);
                return null;
            }

            const items = request.items.map(item => {
                const product = productMap[item.productCode];
                if (!product) {
                    console.warn(`[WARN] Product "${item.productCode}" not found for request "${request.requestCode}"`);
                    return null;
                }
                return {
                    product: product._id,
                    requestedQuantity: item.requestedQuantity,
                    actualQuantity: item.actualQuantity || 0
                };
            }).filter(Boolean);

            if (items.length === 0) return null;

            return {
                ...request,
                createdBy: userMap[request.createdByUsername],
                adminApprovedBy: request.adminApprovedByUsername ? userMap[request.adminApprovedByUsername] : undefined,
                khoManager: request.khoManagerUsername ? userMap[request.khoManagerUsername] : undefined,
                items
            };
        })
        .filter(Boolean);

    await ProductExportRequest.insertMany(docs);
    console.log(`[OK] Seeded ${docs.length} product export requests`);
};

export const seedProductExportSlips = async () => {
    const existingLinked = await InventoryImportExportSlip.countDocuments({
        relatedProductExportRequest: { $exists: true, $ne: null }
    });
    if (existingLinked > 0) return;

    const requests = await ProductExportRequest.find({
        status: { $in: [REQUISITION_STATUS.APPROVED, REQUISITION_STATUS.COMPLETED] }
    })
        .populate('items.product')
        .populate('createdBy')
        .populate('khoManager')
        .lean();

    if (!requests.length) {
        console.log("No approved/completed product export requests to seed slips");
        return;
    }

    const usedSlipNumbers = new Set(
        (await InventoryImportExportSlip.find({}).select('slipNumber').lean()).map(s => s.slipNumber)
    );

    const slipDocs = [];
    let seq = 1;
    for (const req of requests) {
        if (!Array.isArray(req.items) || req.items.length === 0) continue;

        const baseDate = req.completedAt || req.approvedAt || req.createdAt || new Date();
        const dateStr = new Date(baseDate).toISOString().slice(0, 10).replace(/-/g, '');
        let slipNumber;
        do {
            slipNumber = `PXK-${dateStr}-${String(seq).padStart(4, '0')}`;
            seq++;
        } while (usedSlipNumbers.has(slipNumber));
        usedSlipNumbers.add(slipNumber);

        const slipStatus = req.status === REQUISITION_STATUS.COMPLETED
            ? INVENTORY_IMPORT_EXPORT_SLIP_STATUS.COMPLETED
            : INVENTORY_IMPORT_EXPORT_SLIP_STATUS.PENDING;

        const items = req.items
            .filter((it) => it.product)
            .map((it) => {
                const requested = Number(it.requestedQuantity || 0);
                const actual = req.status === REQUISITION_STATUS.COMPLETED
                    ? Number(it.actualQuantity || requested)
                    : 0;
                const unitPrice = Number(it.product?.baseCost || 0);
                return {
                    product: it.product._id,
                    itemName: it.product.name,
                    itemCode: it.product.code,
                    unit: it.product.unit || 'cai',
                    quantity: {
                        requested,
                        provisional: 0,
                        actual
                    },
                    unitPrice,
                    amount: actual * unitPrice
                };
            });

        if (!items.length) continue;

        const totalAmount = items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
        slipDocs.push({
            type: INVENTORY_IMPORT_EXPORT_SLIP_TYPE.EXPORT,
            slipNumber,
            date: baseDate,
            status: slipStatus,
            personName: req.createdBy?.fullName || 'Khach hang/Dai ly',
            reason: `Xuat theo yeu cau ${req.requestCode}${req.reason ? `: ${req.reason}` : ''}`,
            relatedProductExportRequest: req._id,
            items,
            totalAmount,
            signatures: {
                creator: req.createdBy?._id || req.createdBy,
                storekeeper: req.khoManager?._id || req.khoManager || undefined
            },
            finalizedAt: req.status === REQUISITION_STATUS.COMPLETED ? (req.completedAt || baseDate) : undefined
        });
    }

    if (slipDocs.length === 0) {
        console.log("No valid export slips generated from product export requests");
        return;
    }

    const createdSlips = await InventoryImportExportSlip.insertMany(slipDocs);
    const slipMapByRequestId = new Map(
        createdSlips.map((s) => [String(s.relatedProductExportRequest), s._id])
    );

    const bulkRequestUpdates = [];
    for (const req of requests) {
        const slipId = slipMapByRequestId.get(String(req._id));
        if (!slipId) continue;
        bulkRequestUpdates.push({
            updateOne: {
                filter: { _id: req._id },
                update: { $set: { relatedSlip: slipId } }
            }
        });
    }
    if (bulkRequestUpdates.length > 0) {
        await ProductExportRequest.bulkWrite(bulkRequestUpdates, { ordered: false });
    }

    console.log(`Seeded ${createdSlips.length} product export slips and linked requests`);
};

export const seedInventoryTransactions = async () => {
    if (await InventoryTransaction.countDocuments()) return;

    const users = await User.find({}).lean();
    const fallbackUser = users.find((u) => u.username === 'khomanager') || users.find((u) => u.username === 'admin') || users[0];
    if (!fallbackUser) {
        console.warn('[WARN] Skip inventory transactions seed: no users found');
        return;
    }

    const batches = await InventoryBatch.find({})
        .sort({ receivedDate: 1, _id: 1 })
        .populate('shelf', 'shelfCode')
        .lean();

    const txDocs = [];
    const batchRemainingById = new Map();
    const itemGroups = new Map();
    const now = Date.now();

    batches.forEach((b, index) => {
        const itemType = b.material ? 'material' : 'product';
        const itemId = (b.material || b.product)?.toString();
        if (!itemId) return;
        const key = `${itemType}:${itemId}`;
        if (!itemGroups.has(key)) itemGroups.set(key, []);
        itemGroups.get(key).push({ ...b, _seedIndex: index });
        batchRemainingById.set(String(b._id), Number(b.quantityReceived || 0));
    });

    // 1) Create receive transactions first
    for (const b of batches) {
        const received = Number(b.quantityReceived || 0);
        if (received <= 0) continue;
        const itemRef = b.material ? { material: b.material } : { product: b.product };
        const location = b.shelf?.shelfCode || 'UNASSIGNED';
        const idx = batches.findIndex((x) => String(x._id) === String(b._id));

        txDocs.push({
            ...itemRef,
            batch: b._id,
            type: TRANSACTION_TYPE.RECEIVE,
            quantity: received,
            beforeStock: 0,
            afterStock: received,
            orderRef: `SEED-RECEIVE-${String(idx + 1).padStart(4, '0')}`,
            location,
            note: 'Seed receive transaction',
            performedBy: fallbackUser._id,
            createdAt: new Date(now - (65 - Math.min(idx, 55)) * 24 * 60 * 60 * 1000),
            updatedAt: new Date(now - (65 - Math.min(idx, 55)) * 24 * 60 * 60 * 1000),
        });
    }

    // 2) Create outbound transactions per item using strict FIFO allocation
    let orderSeq = 1;
    for (const [key, group] of itemGroups.entries()) {
        const [itemType] = key.split(':');
        const itemRef = itemType === 'material'
            ? { material: group[0].material }
            : { product: group[0].product };

        const totalReceived = group.reduce((sum, b) => sum + Number(b.quantityReceived || 0), 0);
        if (totalReceived <= 1) continue;

        // Split outbound into 2 seeded orders to show timeline and cross-batch behavior.
        const totalOutbound = Math.max(1, Math.floor(totalReceived * 0.4));
        const firstBatchQty = Number(group[0].quantityReceived || 0);
        const order1Qty = group.length >= 2
            ? Math.min(totalOutbound, Math.max(1, firstBatchQty + Math.floor(Number(group[1].quantityReceived || 0) * 0.4)))
            : Math.max(1, Math.floor(totalOutbound * 0.7));
        const order2Qty = Math.max(0, totalOutbound - order1Qty);
        const orderDemands = [order1Qty, order2Qty].filter((x) => x > 0);

        for (const demand of orderDemands) {
            let remainingDemand = demand;
            const orderRef = itemType === 'material'
                ? `REQ-SEED-${String(orderSeq).padStart(4, '0')}`
                : `EXP-SEED-${String(orderSeq).padStart(4, '0')}`;
            orderSeq++;

            for (const b of group) {
                if (remainingDemand <= 0) break;
                const batchId = String(b._id);
                const available = Number(batchRemainingById.get(batchId) || 0);
                if (available <= 0) continue;

                const take = Math.min(available, remainingDemand);
                const next = available - take;
                const location = b.shelf?.shelfCode || 'UNASSIGNED';
                const outboundType = itemType === 'material'
                    ? (orderSeq % 2 === 0 ? TRANSACTION_TYPE.ISSUE : TRANSACTION_TYPE.DEDUCT)
                    : TRANSACTION_TYPE.SALES_OUT;

                txDocs.push({
                    ...itemRef,
                    batch: b._id,
                    type: outboundType,
                    quantity: take,
                    beforeStock: available,
                    afterStock: next,
                    orderRef,
                    location,
                    note: 'Seed outbound transaction with FIFO allocation',
                    performedBy: fallbackUser._id,
                    createdAt: new Date(now - (25 - Math.min(orderSeq, 20)) * 24 * 60 * 60 * 1000),
                    updatedAt: new Date(now - (25 - Math.min(orderSeq, 20)) * 24 * 60 * 60 * 1000),
                });

                batchRemainingById.set(batchId, next);
                remainingDemand -= take;
            }
        }
    }

    if (txDocs.length > 0) {
        await InventoryTransaction.insertMany(txDocs);
    }

    // 3) Sync quantityRemaining on batches with seeded FIFO outbound transactions
    const bulkUpdates = [];
    for (const [batchId, remaining] of batchRemainingById.entries()) {
        bulkUpdates.push({
            updateOne: {
                filter: { _id: batchId },
                update: {
                    $set: {
                        quantityRemaining: remaining,
                        isExhausted: remaining <= 0
                    }
                }
            }
        });
    }
    if (bulkUpdates.length > 0) {
        await InventoryBatch.bulkWrite(bulkUpdates, { ordered: false });
    }

    console.log(`[OK] Seeded ${txDocs.length} inventory transactions`);
};

export const syncCurrentStockFromBatches = async () => {
    const [materialStockRows, productStockRows] = await Promise.all([
        InventoryBatch.aggregate([
            { $match: { material: { $ne: null } } },
            { $group: { _id: '$material', currentStock: { $sum: '$quantityRemaining' } } }
        ]),
        InventoryBatch.aggregate([
            { $match: { product: { $ne: null } } },
            { $group: { _id: '$product', currentStock: { $sum: '$quantityRemaining' } } }
        ])
    ]);

    const materialOps = materialStockRows.map((row) => ({
        updateOne: {
            filter: { _id: row._id },
            update: { $set: { currentStock: Number(row.currentStock || 0) } }
        }
    }));

    const productOps = productStockRows.map((row) => ({
        updateOne: {
            filter: { _id: row._id },
            update: { $set: { currentStock: Number(row.currentStock || 0) } }
        }
    }));

    await Promise.all([
        materialOps.length > 0 ? Material.bulkWrite(materialOps, { ordered: false }) : Promise.resolve(),
        productOps.length > 0 ? Product.bulkWrite(productOps, { ordered: false }) : Promise.resolve()
    ]);

    console.log(`[OK] Synced currentStock from batches (${materialOps.length} materials, ${productOps.length} products)`);
};

export const seedMaterialAlerts = async () => {
    if (await MaterialAlert.countDocuments()) return;

    const orders = await ProductionOrder.find({
        status: { $in: [ORDER_STATUS.PENDING, ORDER_STATUS.IN_PRODUCTION, ORDER_STATUS.ASSIGNED] }
    })
        .populate("products.product")
        .lean();

    const alerts = [];
    const insufficientOrderIds = new Set();

    for (const order of orders) {
        const requirements = new Map();

        for (const item of order.products || []) {
            const product = item.product;
            if (!product?.estimateMaterialCost?.length) continue;

            for (const matCost of product.estimateMaterialCost) {
                const materialId = matCost.material?.toString();
                if (!materialId) continue;

                const needed = Number(matCost.quantity || 0) * Number(item.quantity || 0);
                requirements.set(materialId, (requirements.get(materialId) || 0) + needed);
            }
        }

        if (requirements.size === 0) continue;

        const materialIds = [...requirements.keys()];
        const materials = await Material.find({ _id: { $in: materialIds } }).lean();
        const materialMap = buildMap(materials, (m) => m._id.toString(), (m) => m);

        let orderHasShortage = false;

        for (const [materialId, neededRaw] of requirements.entries()) {
            const material = materialMap[materialId];
            if (!material) continue;

            const available = Number(material.currentStock || 0);
            let needed = Number(neededRaw || 0);
            let shortage = needed - available;

            // Ensure seed has actionable alerts for end-to-end testing.
            if (shortage <= 0 && !orderHasShortage) {
                needed = available + Math.max(1, Math.ceil(available * 0.15));
                shortage = needed - available;
            }

            if (shortage > 0) {
                alerts.push({
                    material: material._id,
                    materialCode: material.code,
                    materialName: material.name,
                    neededQuantity: needed,
                    availableQuantity: available,
                    shortageQuantity: shortage,
                    productionOrder: order._id,
                    status: "pending",
                });
                orderHasShortage = true;
            }
        }

        if (orderHasShortage) {
            insufficientOrderIds.add(order._id.toString());
        }
    }

    if (alerts.length > 0) {
        await MaterialAlert.insertMany(alerts);
    }

    if (insufficientOrderIds.size > 0) {
        await ProductionOrder.updateMany(
            { _id: { $in: [...insufficientOrderIds] } },
            { $set: { status: ORDER_STATUS.INSUFFICIENT_MATERIALS } }
        );
    }

    console.log(`[OK] Seeded ${alerts.length} material alerts and marked ${insufficientOrderIds.size} order(s) as insufficient`);
};



