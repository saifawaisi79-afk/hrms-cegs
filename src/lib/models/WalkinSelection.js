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
    date: { type: String, default: '' },
    createdBy: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.models.WalkinSelection ||
  mongoose.model('WalkinSelection', WalkinSelectionSchema);
