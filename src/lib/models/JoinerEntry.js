import mongoose from 'mongoose';

/** HR Joiner Sheet — Google-sheet style register for joined candidates. */
const JoinerEntrySchema = new mongoose.Schema(
  {
    slNo: { type: Number, default: 0 },
    name: { type: String, default: '' },
    phone: { type: String, default: '' },
    /** Process / domain (Voice, Blended, etc.) */
    process: { type: String, default: '' },
    /** Client company (ISON, ALTRUIST, ONE POINT ONE, STARTEK, etc.) */
    company: { type: String, default: '' },
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
    /** Soft-delete & permanent-exclusion flags scoped to Weekly Update (A) */
    weeklyDeleted: { type: Boolean, default: false },
    weeklyDeletedAt: { type: String, default: '' },
    weeklyDeletedBy: { type: String, default: '' },
    weeklyExcluded: { type: Boolean, default: false },
  },
  { timestamps: true }
);

JoinerEntrySchema.index({ candidateId: 1 });
JoinerEntrySchema.index({ process: 1 });
JoinerEntrySchema.index({ company: 1 });
JoinerEntrySchema.index({ weeklyDeleted: 1, weeklyExcluded: 1 });

export default mongoose.models.JoinerEntry || mongoose.model('JoinerEntry', JoinerEntrySchema);
