import mongoose from 'mongoose';
import { backfillInitialBatches } from '../services/fifoService.js';
import { connectWithRetry } from '../config/db/connection.js';
import '../models/models_list.js'; // Ensure all models are registered

const fixStock = async () => {
    try {
        console.log('Connecting to database...');
        await connectWithRetry();

        console.log('Starting stock backfill...');
        const result = await backfillInitialBatches();

        if (result.success) {
            console.log('✅ SUCCESS:', result.message);
        } else {
            console.error('❌ FAILED:', result.message);
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ CRITICAL ERROR:', error.message);
        process.exit(1);
    }
};

fixStock();
