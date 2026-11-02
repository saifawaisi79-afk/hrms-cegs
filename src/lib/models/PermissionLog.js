import mongoose from 'mongoose';

const PermissionLogSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    user_name: {
      type: String,
      required: true,
      trim: true,
    },
    user_email: {
      type: String,
      default: '',
      trim: true,
    },
    employee_id: {
      type: String,
      default: '',
      trim: true,
    },
    permission_type: {
      type: String,
      enum: ['wfh', 'auto_attendance_ontime', 'clause_40_waive', 'early_logout'],
      required: true,
      index: true,
    },
    action: {
      type: String,
      enum: ['granted', 'revoked', 'overridden'],
      default: 'granted',
    },
    effective_date: {
      type: String,
      required: true,
      index: true,
    }, // YYYY-MM-DD
    reason: {
      type: String,
      required: true,
      default: 'Approved by HR',
      trim: true,
    },
    granted_by: {
      type: String,
      default: 'HR Admin',
      trim: true,
    },
    granted_by_role: {
      type: String,
      default: 'admin',
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

PermissionLogSchema.index({ user_id: 1, effective_date: 1 });
PermissionLogSchema.index({ createdAt: -1 });

export default mongoose.models.PermissionLog ||
  mongoose.model('PermissionLog', PermissionLogSchema);

