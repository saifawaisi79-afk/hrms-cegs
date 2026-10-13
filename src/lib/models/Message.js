import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema(
  {
    from_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    to_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    group_id: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatGroup', default: null, index: true },
    text: { type: String, default: '', trim: true, maxlength: 4000 },
    image_url: { type: String, default: '' },
    read: { type: Boolean, default: false },
    read_by: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

MessageSchema.index({ from_id: 1, to_id: 1, createdAt: -1 });
MessageSchema.index({ group_id: 1, createdAt: 1 });

export default mongoose.models.Message || mongoose.model('Message', MessageSchema);
