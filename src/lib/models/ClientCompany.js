import mongoose from 'mongoose';

const ClientCompanySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    contactPerson: { type: String, default: '' },
    email: { type: String, default: '' },
    phone: { type: String, default: '' },
    gstin: { type: String, default: '' },
    address: { type: String, default: '' },
    industry: { type: String, default: 'Technology & Consulting' },
    paymentTerms: { type: String, default: 'Net 30' },
    notes: { type: String, default: '' },
    status: { type: String, default: 'Active' },
  },
  { timestamps: true }
);

ClientCompanySchema.index({ name: 1 }, { unique: true, sparse: true });

export default mongoose.models.ClientCompany || mongoose.model('ClientCompany', ClientCompanySchema);
