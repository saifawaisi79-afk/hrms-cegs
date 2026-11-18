import mongoose from 'mongoose';

const GoogleIntegrationSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  google_account_email: { type: String, default: '' },
  access_token: { type: String, default: '' },
  refresh_token: { type: String, required: true },
  expiry_date: { type: Number, default: 0 },
  token_type: { type: String, default: 'Bearer' },
  scope: { type: String, default: '' },
  is_active: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.models.GoogleIntegration || mongoose.model('GoogleIntegration', GoogleIntegrationSchema);

