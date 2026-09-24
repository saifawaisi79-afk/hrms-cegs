import mongoose from 'mongoose';

/**
 * Idempotent bonus records.
 * Unique: campaign + type + employee + periodKey
 * weekly_bonus periodKey = weekKey (e.g. 2026-W39)
 * eom periodKey = monthKey (e.g. 2026-09)
 */
const CampaignAwardSchema = new mongoose.Schema(
  {
    campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', required: true },
    type: { type: String, enum: ['weekly_bonus', 'eom'], required: true },
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    periodKey: { type: String, required: true },
    amount: { type: Number, required: true },
    joiners: { type: Number, default: 0 },
    target: { type: Number, default: 0 },
    weeklyWins: { type: Number, default: 0 },
    meta: { type: Object, default: {} },
  },
  { timestamps: true }
);

CampaignAwardSchema.index(
  { campaignId: 1, type: 1, employeeId: 1, periodKey: 1 },
  { unique: true }
);

export default mongoose.models.CampaignAward || mongoose.model('CampaignAward', CampaignAwardSchema);
