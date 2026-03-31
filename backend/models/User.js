import mongoose from 'mongoose';
import { ROLES } from '../utils/constants.js';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  fullName: { type: String, required: true, trim: true , minlength: 3 },
  phone: { type: String, required: true, trim: true , unique: true },
  address: { type: String, trim: true, },
  birthDate: { type: Date },
  gender: { type: String, enum: ['male', 'female'], default: 'male', required: true },
  avatar: { type: String, default: 'https://th.bing.com/th/id/OIP.fJBE-eHSQaEAChDXIjmrpQHaJQ?o=7rm=3&rs=1&pid=ImgDetMain&o=7&rm=3' },

  role: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role',
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
  toJSON: { 
    transform(doc, ret) {
      delete ret.password;
      return ret;
    }
   },
});

userSchema.index({ currentAssignedQuantity: 1 });
userSchema.index({ isActive: 1 });

// extensions 
userSchema.statics.comparePassword  = function (candidatePassword, userPassword) {
  return bcrypt.compareSync(candidatePassword, userPassword);
};
userSchema.pre('save', async function () {
  const user = this;
  if (!user.isModified('password')) {
    return;
  }
  const salt = bcrypt.genSaltSync(10);
  user.password = bcrypt.hashSync(user.password, salt);
});


export default mongoose.model('User', userSchema);