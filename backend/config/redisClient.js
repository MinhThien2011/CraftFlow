import { createClient } from 'redis';

// ─── Health State ────────────────────────────────────────────────────────────
let isRedisHealthy = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 20;

export const getRedisHealth = () => isRedisHealthy;

// ─── Client ──────────────────────────────────────────────────────────────────
export const client = createClient({
    username: 'default',
    password: process.env.REDIS_PASSWORD,
    socket: {
        host: process.env.REDIS_HOST,
        port: Number(process.env.REDIS_PORT) || 6379,
        connectTimeout: 5000,
        keepAlive: 15000,

        // ✅ node-redis v4/v5 dùng reconnectStrategy (KHÔNG phải retryStrategy)
        reconnectStrategy: (attempts) => {
            reconnectAttempts = attempts;

            if (attempts > MAX_RECONNECT_ATTEMPTS) {
                console.error('❌ Redis: Max reconnection attempts reached. Disabling Redis.');
                isRedisHealthy = false;
                return false; // dừng retry, trả về false
            }

            // Exponential backoff + jitter, tối đa 10s
            const base = Math.min(attempts * 500, 10000);
            const jitter = Math.floor(Math.random() * 200);
            const delay = base + jitter;

            if (attempts % 5 === 0) {
                console.log(`🔄 Redis reconnect attempt #${attempts} in ${delay}ms`);
            }

            return delay;
        },
    }
});

// ─── Event Listeners ─────────────────────────────────────────────────────────
client.on('connect', () => console.log('🔗 Redis: Connecting...'));
client.on('ready', () => {
    console.log('✅ Redis: Ready');
    isRedisHealthy = true;
    reconnectAttempts = 0;
});
client.on('end', () => {
    console.log('🔌 Redis: Connection closed');
    isRedisHealthy = false;
});
client.on('reconnecting', () => console.log('🔄 Redis: Reconnecting...'));
client.on('error', (err) => {
    // Tránh spam log với lỗi kết nối thông thường
    const suppressedCodes = ['ECONNREFUSED', 'ECONNRESET', 'ENOTFOUND', 'ETIMEDOUT'];
    if (!suppressedCodes.includes(err.code)) {
        console.error('❌ Redis Error:', err.message);
    }
    isRedisHealthy = false;
});

// ─── Connect ─────────────────────────────────────────────────────────────────
export const redisConnect = async () => {
    try {
        if (client.isOpen) return;
        await client.connect();
    } catch (err) {
        // Không throw — app vẫn chạy được không có Redis
        console.error('❌ Redis: Initial connection failed:', err.message);
        isRedisHealthy = false;
    }
};

// ─── Health Check Interval ───────────────────────────────────────────────────
const redisCheckStatus = (interval = 15000) => {
    setInterval(async () => {
        if (!client.isOpen) {
            isRedisHealthy = false;
            return;
        }
        try {
            const start = Date.now();
            await client.ping();
            const latency = Date.now() - start;

            if (latency > 1000) {
                console.warn(`⚠️ Redis: High latency (${latency}ms)`);
            }
            isRedisHealthy = true;
        } catch (err) {
            isRedisHealthy = false;
            console.error('❌ Redis: Health check failed:', err.message);
        }
    }, interval);
};

redisCheckStatus();