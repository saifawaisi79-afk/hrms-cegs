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
}, { timestamps: true });

export default mongoose.models.Leave || mongoose.model('Leave', LeaveSchema);
