import mongoose from 'mongoose';

const counterSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true }, // e.g., 'shrinkage_code', 'slip_number'
    seq: { type: Number, default: 0 },
    date: { type: String } // Optional: to reset counter daily e.g., '20240325'
});

export default mongoose.model('Counter', counterSchema);
