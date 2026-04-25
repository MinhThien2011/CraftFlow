import { createClient } from 'redis';

const retryStrategy = (times) => {
    const delay = Math.min(times * 100, 1000);
    console.log(`🔄 Redis reconnect attempt ${times + 1} in ${delay}ms`);
    return delay;
}
const reconnectOnError = (err) => {
    const errors = ['READONLY', 'ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED'];
    return errors.some(e => err.message.includes(e));
}
export const client = createClient({
    username: 'default',
    password: process.env.REDIS_PASSWORD,
    socket: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
        retryStrategy,
        reconnectOnError,
    }
});

client.on('connect', () => console.log('🔗 Redis Client Connected'));
client.on('ready', () => console.log('✅ Redis Client Ready'));
client.on('end', () => console.log('❌ Redis Client End'));
client.on('reconnecting', () => console.log('🔄 Redis Client Reconnecting'));
client.on('reconnect', () => console.log('🔄 Redis Client Reconnect'));
client.on('reconnect_failed', () => console.log('❌ Redis Client Reconnect Failed'));
client.on('error', err => console.log('❌ Redis Client Error', err));

export const redisConnect = async () => {
    try {
        await client.connect();
        redisCheckStatus();
        console.log('✅ Redis Client Connected');
    } catch (err) {
        console.log('❌ Redis Client Error', err);
    }
}
const redisCheckStatus = (timeout = 10000) => {
    setInterval(async () => {
        if (!client.isOpen) {
            console.log("🔄 Redis not open, reconnecting...");
            try {
                await client.connect();
            } catch (err) {
                console.error("❌ Redis reconnect failed:", err.message);
            }
        } else {
            try {
                await client.ping();
            } catch (err) {
                console.error("❌ Redis ping failed:", err.message);
            }
        }
    }, timeout);
}

// process.on("SIGINT", async () => {
//     console.log("🚦 Shutting down Redis clients...");
//     client.destroy();
//     process.exit(0);
// });
