import { createClient } from 'redis';

const retryStrategy = (times) => {
    // Exponential backoff with jitter
    const delay = Math.min(times * 500, 10000); // Increased delay
    const jitter = Math.floor(Math.random() * 200);
    const totalDelay = delay + jitter;

    if (times % 5 === 0) {
        console.log(`🔄 Redis reconnect attempt ${times} in ${totalDelay}ms`);
    }

    // Stop retrying if the host is completely unreachable (DNS issue)
    // This prevents infinite loop of ENOTFOUND errors
    if (times > 20) { 
        console.error('❌ Redis: Max reconnection attempts reached. Continuing without Redis caching/ratelimiting.');
        isRedisHealthy = false;
        return false; // Stop retrying
    }
    return totalDelay;
}

const reconnectOnError = (err) => {
    const errors = ['READONLY', 'ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED', 'SOCKET_CLOSED', 'ENOTFOUND'];
    const shouldReconnect = errors.some(e => err.message.includes(e));
    if (shouldReconnect) {
        console.warn(`⚠️ Redis: Reconnecting due to error: ${err.message}`);
    }
    return shouldReconnect;
}

export const client = createClient({
    username: 'default',
    password: process.env.REDIS_PASSWORD,
    socket: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
        retryStrategy,
        reconnectOnError,
        keepAlive: 15000, // Reduced for faster detection
        connectTimeout: 5000, // Faster failover
    }
});

client.on('connect', () => console.log('🔗 Redis Client Connected'));
client.on('ready', () => console.log('✅ Redis Client Ready'));
client.on('end', () => console.log('❌ Redis Client End'));
client.on('reconnecting', () => console.log('🔄 Redis Client Reconnecting'));
client.on('reconnect', () => console.log('🔄 Redis Client Reconnect'));
client.on('error', err => {
    // Avoid spamming logs for certain errors
    if (err.code !== 'ECONNREFUSED' && err.code !== 'ECONNRESET') {
        console.error('❌ Redis Client Error:', err);
    }
});

export const redisConnect = async () => {
    try {
        if (!client.isOpen) {
            await client.connect();
        }
    } catch (err) {
        console.error('❌ Redis Initial Connection Error:', err.message);
    }
}

// Improved health check with fail-fast
let isRedisHealthy = true;
export const getRedisHealth = () => isRedisHealthy;

const redisCheckStatus = (interval = 10000) => {
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
                console.warn(`⚠️ Redis: High latency detected (${latency}ms)`);
            }

            isRedisHealthy = true;
        } catch (err) {
            isRedisHealthy = false;
            console.error("❌ Redis: Health check failed:", err.message);
        }
    }, interval);
}

redisCheckStatus();

// process.on("SIGINT", async () => {
//     console.log("🚦 Shutting down Redis clients...");
//     client.destroy();
//     process.exit(0);
// });
