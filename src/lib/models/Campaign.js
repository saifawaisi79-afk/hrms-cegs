import mongoose from 'mongoose';

const CampaignSchema = new mongoose.Schema(
  {
    /** YYYY-MM in IST — one campaign assignment per month */
    monthKey: { type: String, required: true, unique: true },
    monthlyTeamTarget: { type: Number, required: true, min: 1 },
    participantIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

CampaignSchema.index({ monthKey: 1 }, { unique: true });

export default mongoose.models.Campaign || mongoose.model('Campaign', CampaignSchema);
