import mongoose from "mongoose";

const URIS = [
    { uri: process.env.MONGO_URI_ATLAS, label: "Atlas", isAtlas: true },
    { uri: process.env.MONGO_URI_RAILWAY, label: "Railway", isAtlas: false },
    { uri: process.env.MONGO_URI_LOCAL, label: "Local", isAtlas: false },
];

const BASE_OPTIONS = {
    serverSelectionTimeoutMS: 10000, // Increased for stability
    socketTimeoutMS: 60000,         // Increased for long-running operations
    dbName: process.env.DB_NAME,
    maxPoolSize: 100,               // Significantly increased for high load
    minPoolSize: 10,                // Maintain a base set of connections
    maxIdleTimeMS: 30000,
    heartbeatFrequencyMS: 10000,
    connectTimeoutMS: 10000,
};

const ATLAS_OPTIONS = {
    serverApi: { version: "1", strict: false, deprecationErrors: true },
};

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 5000;

let _connectionPromise = null;
let _handlersRegistered = false;
let _retryTimer = null;

const state = () => mongoose.connection.readyState;

const tryConnect = async ({ uri, label, isAtlas }) => {
    if (!uri) {
        console.warn(`⚠️  ${label} URI not configured — skipping`);
        return false;
    }

    if (state() !== 0) {
        await mongoose.connection.close(false).catch(() => mongoose.connection.close(true));
    }

    const options = isAtlas ? { ...BASE_OPTIONS, ...ATLAS_OPTIONS } : BASE_OPTIONS;

    try {
        console.log(`📡 Connecting to ${label}...`);
        await mongoose.connect(uri, options);
        await mongoose.connection.db.admin().command({ ping: 1 });
        console.log(`✅ Connected to ${label} — db: ${mongoose.connection.db.databaseName}`);
        return true;
    } catch (err) {
        console.error(`❌ ${label} failed: ${err.message}`);
        if (state() !== 0) {
            await mongoose.connection.close(true).catch(() => { });
        }
        return false;
    }
};

const connectWithFallback = async () => {
    for (const target of URIS) {
        if (await tryConnect(target)) return true;
    }
    return false;
};

const connectWithRetry = async (attempt = 1) => {
    if (_connectionPromise) return _connectionPromise;

    _connectionPromise = (async () => {
        try {
            const ok = await connectWithFallback();
            if (ok) return true;
            throw new Error("All MongoDB URIs exhausted");
        } catch (err) {
            console.error(`❌ MongoDB Attempt ${attempt}/${MAX_RETRIES}: ${err.message}`);

            if (attempt < MAX_RETRIES) {
                const delay = RETRY_DELAY_MS * Math.pow(1.5, attempt - 1); // Exponential backoff
                console.log(`⏳ Retrying MongoDB in ${delay / 1000}s...`);
                await new Promise(r => { _retryTimer = setTimeout(r, delay); });
                _connectionPromise = null;
                return connectWithRetry(attempt + 1);
            }

            console.error("❌ MongoDB: Max retries reached. Giving up.");
            return false;
        } finally {
            _connectionPromise = null;
        }
    })();

    return _connectionPromise;
};

export const setupConnectionHandlers = (onReconnected) => {
    if (_handlersRegistered) return;
    _handlersRegistered = true;

    mongoose.connection.on("connected", () => {
        console.log("🟢 MongoDB connection established");
    });

    mongoose.connection.on("disconnected", async () => {
        console.warn("🔴 MongoDB disconnected — attempting reconnect...");
        if (_retryTimer) clearTimeout(_retryTimer);
        const ok = await connectWithRetry();
        if (ok && typeof onReconnected === "function") await onReconnected();
    });

    mongoose.connection.on("reconnected", () => {
        console.log("🔄 MongoDB reconnected");
    });

    mongoose.connection.on("error", (err) => {
        console.error("❌ MongoDB error:", err.message);
    });

    process.on("SIGINT", () => gracefulShutdown("SIGINT"));
    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
};

const gracefulShutdown = async (signal) => {
    console.log(`\n${signal} received — closing MongoDB connection...`);
    if (_retryTimer) clearTimeout(_retryTimer);
    try {
        await mongoose.connection.close();
        console.log("📴 MongoDB connection closed");
    } catch {
        console.error("❌ Error closing MongoDB connection");
    } finally {
        process.exit(0);
    }
};

export { connectWithRetry, state as getConnectionState };