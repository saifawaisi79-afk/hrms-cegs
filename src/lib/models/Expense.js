import mongoose from 'mongoose';

const ExpenseSchema = new mongoose.Schema({
  user_id:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title:       { type: String, required: true },
  category:    { type: String, required: true },
  amount:      { type: Number, required: true },
  date:        { type: String, required: true },
  receipt_url: { type: String, default: null },
  status:      { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  approved_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

export default mongoose.models.Expense || mongoose.model('Expense', ExpenseSchema);
