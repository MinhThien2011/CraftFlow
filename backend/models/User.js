import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  email: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true },
  fullName: { type: String, required: true, trim: true, minlength: 3 },
  phone: { type: String, required: true, trim: true, unique: true },
  address: { type: String, trim: true, },
  birthDay: { type: Date, default: Date.now() },
  gender: { type: String, enum: ['male', 'female'], default: 'male', required: true },
  avatar: { type: String, default: 'https://res.cloudinary.com/dvjop6kew/image/upload/v1776223501/Xi_Jiping_GigaChad_svidsc.png' },

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
    versionKey: false,
    transform: function (doc, ret) {
      delete ret.password;
      return ret;
    }
  },
  toObject: {
    versionKey: false,
    transform: function (doc, ret) {
      delete ret.password;
      return ret;
    }
  }
});

userSchema.index({ fullName: 1 });
userSchema.index({ currentAssignedQuantity: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ role: 1 });

// extensions 
userSchema.statics.comparePassword = function (candidatePassword, userPassword) {
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