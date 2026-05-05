import Counter from '../models/Counter.js';

/**
 * Generates an atomic sequence number for a given key.
 * Resets daily if resetDaily is true.
 */
export const getNextSequence = async (key, resetDaily = false) => {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    
    let query = { id: key };
    if (resetDaily) {
        // If daily reset is needed, we check the date
        const existing = await Counter.findOne({ id: key });
        if (existing && existing.date !== today) {
            await Counter.updateOne({ id: key }, { seq: 0, date: today });
        }
    }

    const counter = await Counter.findOneAndUpdate(
        { id: key },
        { $inc: { seq: 1 }, $set: { date: today } },
        { new: true, upsert: true }
    );

    return counter.seq;
};

/**
 * Generates a formatted code (e.g., SHR-20240325-001) atomically.
 */
export const generateAtomicCode = async (prefix, key, padding = 3) => {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const seq = await getNextSequence(key, true);
    return `${prefix}-${today}-${seq.toString().padStart(padding, '0')}`;
};
