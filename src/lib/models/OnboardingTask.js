import mongoose from 'mongoose';

const OnboardingTaskSchema = new mongoose.Schema({
  hire_id:       { type: mongoose.Schema.Types.ObjectId, ref: 'OnboardingHire', required: true },
  task_name:     { type: String, required: true },
  is_completed:  { type: Boolean, default: false },
  role_specific: { type: String, required: true },
}, { timestamps: true });

export default mongoose.models.OnboardingTask || mongoose.model('OnboardingTask', OnboardingTaskSchema);
