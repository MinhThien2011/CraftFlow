import { createClient } from 'redis';


// ====================== CONFIGURATION ======================
const CONFIG = {
    maxReconnectAttempts: 20,
    healthCheckInterval: 15_000,      // 15 giây
    highLatencyThreshold: 1000,       // 1 giây
    initialConnectTimeout: 10_000,    // 10 giây
};

let isRedisHealthy = false;
let reconnectAttempts = 0;
let _healthCheckTimer = null;
let lastLatency = 0;

// ====================== HEALTH STATUS ======================
export const getRedisHealth = () => isRedisHealthy;
export const getLastLatency = () => lastLatency;

// ====================== CLIENT CREATION ======================
export const client = createClient({
    username: 'default',
    password: process.env.REDIS_PASSWORD,
    socket: {
        host: process.env.REDIS_HOST,
        port: Number(process.env.REDIS_PORT) || 6379,
        connectTimeout: CONFIG.initialConnectTimeout,
        keepAlive: 15_000,
        reconnectStrategy: (attempts) => {
            reconnectAttempts = attempts;

            if (attempts > CONFIG.maxReconnectAttempts) {
                console.error('❌ Redis: Max reconnection attempts reached. Redis features disabled.');
                isRedisHealthy = false;
                return new Error('Max reconnection attempts reached');
            }

            const base = Math.min(attempts * 600, 10_000);
            const jitter = Math.floor(Math.random() * 400) + 100;
            const delay = base + jitter;

            if (attempts % 5 === 0 || attempts === 1) {
                console.log(`🔄 Redis reconnecting... attempt #${attempts} in ${delay}ms`);
            }

            return delay;
        },
    }
});

// ====================== EVENT LISTENERS ======================
client.on('connect', () => console.log('🔗 Redis: Connecting...'));

client.on('ready', () => {
    console.log('✅ Redis: Connected and Ready');
    isRedisHealthy = true;
    reconnectAttempts = 0;
    startHealthCheck();
});

client.on('end', () => {
    console.log('🔌 Redis: Connection closed');
    isRedisHealthy = false;
    stopHealthCheck();
});

client.on('reconnecting', () => {
    console.log('🔄 Redis: Reconnecting...');
    isRedisHealthy = false;
});

client.on('error', (err) => {
    const suppressed = ['ECONNREFUSED', 'ECONNRESET', 'ENOTFOUND', 'ETIMEDOUT', 'ECONNABORTED'];
    if (!suppressed.includes(err.code)) {
        console.error('❌ Redis Error:', err.message);
    }
    isRedisHealthy = false;
});

// ====================== CONNECT FUNCTION ======================
export const redisConnect = async () => {
    try {
        if (client.isOpen) {
            console.log('✅ Redis: Already connected');
            return;
        }

        console.log('🔌 Attempting to connect to Redis...');
        await client.connect();
    } catch (err) {
        console.error('❌ Redis: Initial connection failed:', err.message);
        isRedisHealthy = false;
    }
};

// ====================== HEALTH CHECK ======================
const startHealthCheck = () => {
    if (_healthCheckTimer) return;

    _healthCheckTimer = setInterval(async () => {
        if (!client.isOpen) {
            isRedisHealthy = false;
            return;
        }

        try {
            const start = Date.now();
            await client.ping();
            lastLatency = Date.now() - start;

            if (lastLatency > CONFIG.highLatencyThreshold) {
                console.warn(`⚠️ Redis: High latency detected (${lastLatency}ms)`);
            }

            isRedisHealthy = true;
        } catch (err) {
            isRedisHealthy = false;
            console.error('❌ Redis: Health check failed:', err.message);
        }
    }, CONFIG.healthCheckInterval);

    if (_healthCheckTimer.unref) _healthCheckTimer.unref();
};

const stopHealthCheck = () => {
    if (_healthCheckTimer) {
        clearInterval(_healthCheckTimer);
        _healthCheckTimer = null;
    }
};

// ====================== GRACEFUL SHUTDOWN ======================
export const redisDisconnect = async () => {
    stopHealthCheck();
    try {
        if (client.isOpen) {
            await client.quit();
            console.log('✅ Redis: Disconnected gracefully');
        }
    } catch (err) {
        console.error('⚠️ Redis: Error during disconnect:', err.message);
    }
};

// ====================== UTILITY ======================
export const isRedisReady = () => client.isOpen && isRedisHealthy;