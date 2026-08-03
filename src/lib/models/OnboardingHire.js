import mongoose from 'mongoose';

const OnboardingHireSchema = new mongoose.Schema({
  user_id:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  position:         { type: String, required: true },
  start_date:       { type: String, required: true },
  progress_percent: { type: Number, default: 0 },
  status:           { type: String, enum: ['in_progress', 'completed'], default: 'in_progress' },
}, { timestamps: true });

export default mongoose.models.OnboardingHire || mongoose.model('OnboardingHire', OnboardingHireSchema);
