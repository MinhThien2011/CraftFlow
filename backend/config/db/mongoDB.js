import { connectWithRetry, setupConnectionHandlers } from "./connection.js";
import { initializeCollections, runSeedPipeline } from "./seeder.js";

export const connectToDatabase = async () => {
    const ok = await connectWithRetry();
    if (!ok) throw new Error("Could not connect to MongoDB");

    await initializeCollections();
    
    // Only run seed pipeline if explicitly requested via env or in development
    if (process.env.AUTO_SEED === 'true' || process.env.NODE_ENV === 'development') {
        await runSeedPipeline();
    }

    setupConnectionHandlers(async () => {
        await initializeCollections();
    });
};

export { initializeCollections } from "./seeder.js";