import mongoose from 'mongoose';

const AttendanceSchema = new mongoose.Schema({
  user_id:           { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date:              { type: String, required: true },
  check_in_time:     { type: String, default: null },
  check_out_time:    { type: String, default: null },
  check_in_lat:      { type: Number, default: null },
  check_in_lng:      { type: Number, default: null },
  status:            { type: String, enum: ['present', 'late', 'absent'], default: 'present' },
  /** clock = real punch · sheet = inferred from Targets work · auto = system absent */
  source:            { type: String, enum: ['clock', 'sheet', 'auto'], default: 'clock' },
  location_verified: { type: Boolean, default: false },
  work_hours:        { type: Number, default: 0 },
  /** Wall-clock timezone for check_in/out strings — Asia/Kolkata once set (legacy rows lack this) */
  time_zone:         { type: String, default: null },
}, { timestamps: true });

AttendanceSchema.index({ user_id: 1, date: 1 }, { unique: true });

export default mongoose.models.Attendance || mongoose.model('Attendance', AttendanceSchema);
