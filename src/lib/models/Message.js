import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema(
  {
    from_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    to_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    text: { type: String, required: true, trim: true, maxlength: 4000 },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

MessageSchema.index({ from_id: 1, to_id: 1, createdAt: -1 });

export default mongoose.models.Message || mongoose.model('Message', MessageSchema);
