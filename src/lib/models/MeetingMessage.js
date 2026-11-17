import mongoose from 'mongoose';

const MeetingMessageSchema = new mongoose.Schema({
  meeting_id: { type: String, required: true, index: true },
  sender_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sender_name: { type: String, required: true },
  sender_email: { type: String, required: true },
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
}, { timestamps: true });

MeetingMessageSchema.index({ meeting_id: 1, createdAt: 1 });

export default mongoose.models.MeetingMessage || mongoose.model('MeetingMessage', MeetingMessageSchema);

