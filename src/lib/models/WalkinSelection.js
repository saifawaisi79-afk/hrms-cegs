import mongoose from 'mongoose';

const WalkinSelectionSchema = new mongoose.Schema(
  {
    slNo: { type: Number, default: 0 },
    name: { type: String, default: '' },
    number: { type: String, default: '' },
    company: { type: String, default: '' },
    process: { type: String, default: '' },
    recruiterName: { type: String, default: '' },
    rounds: { type: String, default: '' },
    furtherUpdate: { type: String, default: '' },
    /** selected | rejected — HR classification override */
    hrStatus: { type: String, default: '' },
    /** Link to Targets candidate when row comes from employee sheet */
    candidateId: { type: String, default: '' },
    date: { type: String, default: '' },
    createdBy: { type: String, default: '' },
  },
  { timestamps: true }
);

WalkinSelectionSchema.index({ candidateId: 1 });

export default mongoose.models.WalkinSelection ||
  mongoose.model('WalkinSelection', WalkinSelectionSchema);
