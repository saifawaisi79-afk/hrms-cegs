import mongoose from 'mongoose';

const TimesheetSchema = new mongoose.Schema({
  user_id:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date:        { type: String, required: true },
  start_time:  { type: String, default: null },
  end_time:    { type: String, default: null },
  duration:    { type: Number, default: 0 },
  project:     { type: String, required: true },
  task:        { type: String, required: true },
  status:      { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  approved_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

export default mongoose.models.Timesheet || mongoose.model('Timesheet', TimesheetSchema);
