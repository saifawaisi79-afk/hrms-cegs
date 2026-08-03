import mongoose from 'mongoose';

const DepartmentSchema = new mongoose.Schema({
  name:       { type: String, required: true, unique: true },
  code:       { type: String, required: true, unique: true },
  manager_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  budget:     { type: Number, default: 0 },
}, { timestamps: true });

export default mongoose.models.Department || mongoose.model('Department', DepartmentSchema);
