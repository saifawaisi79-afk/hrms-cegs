import mongoose from 'mongoose';

const RecruitmentCompanySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true, uppercase: true },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
    createdBy: { type: String, default: 'SYSTEM' },
  },
  { timestamps: true }
);

export default mongoose.models.RecruitmentCompany ||
  mongoose.model('RecruitmentCompany', RecruitmentCompanySchema);
