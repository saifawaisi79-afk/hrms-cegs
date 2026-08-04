import mongoose from 'mongoose';

const LeaveSchema = new mongoose.Schema({
  user_id:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  leave_type:       { type: String, required: true },
  start_date:       { type: String, required: true },
  end_date:         { type: String, required: true },
  reason:           { type: String, default: '' },
  status:           { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  applied_date:     { type: String, required: true },
  approved_by:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  rejection_reason: { type: String, default: null },
  /** Monthly policy: paid | unpaid | mixed */
  pay_type:         { type: String, enum: ['paid', 'unpaid', 'mixed'], default: 'paid' },
  paid_days:        { type: Number, default: 0 },
  unpaid_days:      { type: Number, default: 0 },
  total_days:       { type: Number, default: 0 },
}, { timestamps: true });

export default mongoose.models.Leave || mongoose.model('Leave', LeaveSchema);
