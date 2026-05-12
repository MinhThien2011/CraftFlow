import mongoose from "mongoose";
import { client } from "../config/redisClient.js";

export const setupGracefulShutdown = () => {
    const signals = ["SIGINT", "SIGTERM"];

    signals.forEach((signal) => {
        process.on(signal, async () => {
            console.log(`\nCleanup initiated by ${signal}...`);
            const forceExit = setTimeout(() => {
                console.error("Could not close connections in time, forcefully shutting down");
                process.exit(1);
            }, 10000);

            try {
                if (mongoose.connection.readyState !== 0) {
                    await mongoose.connection.close();
                    console.log("📴 MongoDB connection closed.");
                }

                if (client.isOpen) {
                    client.destroy();
                    console.log("🚦 Redis client disconnected.");
                }

                clearTimeout(forceExit);
                console.log("✅ Graceful shutdown complete.");
                process.exit(0);
            } catch (err) {
                console.error("❌ Error during shutdown:", err);
                process.exit(1);
            }
        });
    });
};