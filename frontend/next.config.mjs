/** @type {import('next').NextConfig} */
const nextConfig = {
  // Tắt nút Next.js màu đỏ / menu Dev Tools khi chạy `next dev` (chỉ môi trường dev)
  devIndicators: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    // Giảm kích thước bundle: chỉ bundle icon lucide-react đang dùng
    optimizePackageImports: ['lucide-react'],
  },
}

export default nextConfig
