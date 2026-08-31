import mongoose from 'mongoose';

/** HR Joiner Sheet — Google-sheet style register for joined candidates. */
const JoinerEntrySchema = new mongoose.Schema(
  {
    slNo: { type: Number, default: 0 },
    name: { type: String, default: '' },
    phone: { type: String, default: '' },
    /** Process / client company (ISON, ALTRUIST, …) */
    process: { type: String, default: '' },
    dateOfJoining: { type: String, default: '' },
    billingDate: { type: String, default: '' },
    employeeCode: { type: String, default: '' },
    interviewDate: { type: String, default: '' },
    recruiterName: { type: String, default: '' },
    week1: { type: String, default: '' },
    week2: { type: String, default: '' },
    week3: { type: String, default: '' },
    week4: { type: String, default: '' },
    week5: { type: String, default: '' },
    week6: { type: String, default: '' },
    week7: { type: String, default: '' },
    week8: { type: String, default: '' },
    /** Link to Targets candidate when auto-pulled from sheet */
    candidateId: { type: String, default: '' },
    createdBy: { type: String, default: '' },
  },
  { timestamps: true }
);

JoinerEntrySchema.index({ candidateId: 1 });
JoinerEntrySchema.index({ process: 1 });

export default mongoose.models.JoinerEntry || mongoose.model('JoinerEntry', JoinerEntrySchema);
