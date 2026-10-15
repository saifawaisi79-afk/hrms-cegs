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
    // CRM Payments & Invoices milestone & company billing extensions
    projectMilestone: { type: String, default: '' },
    amount: { type: Number, default: 0 },
    dueDate: { type: String, default: '' },
    paidDate: { type: String, default: '' },
    clientEmail: { type: String, default: '' },
    clientPhone: { type: String, default: '' },
    notes: { type: String, default: '' },
    // Official Form GST INV – 1 & Client Template Extensions
    templateType: { type: String, default: 'GST_INV_1' },
    clientAddress: { type: String, default: '' },
    clientGstin: { type: String, default: '' },
    clientState: { type: String, default: 'Karnataka' },
    clientStateCode: { type: String, default: '29' },
    poNo: { type: String, default: '' },
    modeOfTransport: { type: String, default: '' },
    vehicleNo: { type: String, default: '' },
    dateTimeOfService: { type: String, default: '' },
    placeOfService: { type: String, default: 'Bangalore' },
    sgstRate: { type: Number, default: 9 },
    cgstRate: { type: Number, default: 9 },
    sgstAmount: { type: Number, default: 0 },
    cgstAmount: { type: Number, default: 0 },
    amountInWords: { type: String, default: '' },
    signatureImage: { type: String, default: '/signatures/usman-zabi-digital-signature.jpg' },
    items: {
      type: [
        {
          sno: { type: String, default: '' },
          empId: { type: String, default: '' },
          employeeName: { type: String, default: '' },
          phone: { type: String, default: '' },
          designation: { type: String, default: '' },
          status: { type: String, default: '' },
          doj: { type: String, default: '' },
          processLob: { type: String, default: '' },
          ratePerSeat: { type: Number, default: 0 },
          sacCode: { type: String, default: '99851' },
          amount: { type: Number, default: 0 },
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

ClientInvoiceSchema.index({ joinerId: 1 }, { unique: true, sparse: true });
ClientInvoiceSchema.index({ stage: 1, monthKey: 1, client: 1 });

export default mongoose.models.ClientInvoice || mongoose.model('ClientInvoice', ClientInvoiceSchema);
