import mongoose from 'mongoose';
import { ROLES } from '../utils/constants.js';

const roleSchema = new mongoose.Schema({
    roleName: { type: String, enum: Object.values(ROLES), default: ROLES.STAFF, index: true },
});

export default mongoose.model('Role', roleSchema);
