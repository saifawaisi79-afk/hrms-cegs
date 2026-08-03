import mongoose from 'mongoose';

const AttendanceSchema = new mongoose.Schema({
  user_id:           { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date:              { type: String, required: true },
  check_in_time:     { type: String, default: null },
  check_out_time:    { type: String, default: null },
  check_in_lat:      { type: Number, default: null },
  check_in_lng:      { type: Number, default: null },
  status:            { type: String, enum: ['present', 'late', 'absent'], default: 'present' },
  location_verified: { type: Boolean, default: false },
  work_hours:        { type: Number, default: 0 },
}, { timestamps: true });

AttendanceSchema.index({ user_id: 1, date: 1 }, { unique: true });

export default mongoose.models.Attendance || mongoose.model('Attendance', AttendanceSchema);
