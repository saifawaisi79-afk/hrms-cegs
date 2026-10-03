import mongoose from 'mongoose';

const ClientInvoiceSchema = new mongoose.Schema(
  {
    stage: { type: String, enum: ['to_raise', 'raised', 'cleared'], required: true },
    /** YYYY-MM for to-raise month sheets */
    monthKey: { type: String, default: '' },
    joinerId: { type: String },
    /** Joiners included when this row is a raised/cleared invoice */
    joinerIds: { type: [String], default: [] },
    /** Set on a to-raise row once it is included in a raised invoice */
    invoiceId: { type: String, default: '' },
    candidateName: { type: String, default: '' },
    phone: { type: String, default: '' },
    client: { type: String, default: '' },
    joiningDate: { type: String, default: '' },
    billingDate: { type: String, default: '' },
    recruiter: { type: String, default: '' },
    bi: { type: Number, default: 0 },
    ai: { type: Number, default: 0 },
    status: { type: String, default: '' },
    candidateCount: { type: Number, default: 0 },
    invoiceDate: { type: String, default: '' },
    revisedRequested: { type: String, default: '' },
    revisedSent: { type: String, default: '' },
    invoiceNo: { type: String, default: '' },
    gstStatus: { type: String, default: '' },
    gstAmtStatus: { type: String, default: '' },
    gstNumber: { type: String, default: '' },
    basicAmount: { type: Number, default: 0 },
    moneyReceived: { type: Number, default: 0 },
    remark: { type: String, default: '' },
  },
  { timestamps: true }
);

ClientInvoiceSchema.index({ joinerId: 1 }, { unique: true, sparse: true });
ClientInvoiceSchema.index({ stage: 1, monthKey: 1, client: 1 });

export default mongoose.models.ClientInvoice || mongoose.model('ClientInvoice', ClientInvoiceSchema);
