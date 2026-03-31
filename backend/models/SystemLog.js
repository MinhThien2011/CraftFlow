import mongoose from 'mongoose';

const systemLogSchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Null for unauthenticated actions like failed login
  },
  action: {
    type: String,
    required: true,
    index: true
  },
  module: {
    type: String,
    required: true,
    index: true // e.g., 'AUTH', 'USER', 'MATERIAL', 'ORDER'
  },
  details: {
    type: String,
    required: true
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: false
  },
  metadata: {
    type: Object,
    default: {}
  },
  ipAddress: String,
  userAgent: String
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

// Index for efficient querying by date range
systemLogSchema.index({ createdAt: -1 });

export default mongoose.model('SystemLog', systemLogSchema);
