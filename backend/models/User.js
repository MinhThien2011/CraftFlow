import mongoose from 'mongoose';
import { ROLES } from '../utils/constants.js';

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true, select: false },
  fullName: { type: String, required: true },
  phone: { type: String, required: true },
  address: { type: String, required: true },

  role: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role',
    default: ROLES.STAFF,
  },

  // Workload management - Critical for production planning
  maxDailyCapacity: { type: Number, default: 100 },
  currentAssignedQuantity: { type: Number, default: 0 },

  // Performance tracking
  timeoutCountLast30d: { type: Number, default: 0 },
  hasWarningFlag: { type: Boolean, default: false },
  lastTimeoutAt: { type: Date },

  // Account status
  isActive: { type: Boolean, default: true },

}, {
  timestamps: true,
});

// Index
userSchema.index({ currentAssignedQuantity: 1 });
userSchema.index({ isActive: 1 });

export default mongoose.model('User', userSchema);