import mongoose from 'mongoose';

const AttendanceWarningSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: ['late_clock_in', 'late_lunch_return', 'early_clock_out'],
      required: true,
    },
    date: { type: String, required: true },
    month: { type: Number, required: true },
    year: { type: Number, required: true },
    note: { type: String, default: '' },
  },
  { timestamps: true }
);

AttendanceWarningSchema.index({ user_id: 1, date: 1, type: 1 }, { unique: true });
AttendanceWarningSchema.index({ user_id: 1, year: 1, month: 1 });

export default mongoose.models.AttendanceWarning
  || mongoose.model('AttendanceWarning', AttendanceWarningSchema);
