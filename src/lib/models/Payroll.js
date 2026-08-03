import mongoose from 'mongoose';

const PayrollSchema = new mongoose.Schema({
  user_id:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  month:          { type: Number, required: true },
  year:           { type: Number, required: true },
  basic_salary:   { type: Number, required: true },
  allowances:     { type: Number, default: 0 },
  overtime:       { type: Number, default: 0 },
  bonus:          { type: Number, default: 0 },
  deductions:     { type: Number, default: 0 },
  net_salary:     { type: Number, required: true },
  status:         { type: String, enum: ['processed', 'draft'], default: 'draft' },
  processed_date: { type: String, default: null },
}, { timestamps: true });

PayrollSchema.index({ user_id: 1, month: 1, year: 1 }, { unique: true });

export default mongoose.models.Payroll || mongoose.model('Payroll', PayrollSchema);
