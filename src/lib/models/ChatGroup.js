import mongoose from 'mongoose';

const ChatGroupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      default: '',
      trim: true,
      maxlength: 500,
    },
    avatar: {
      type: String,
      default: '',
    },
    color: {
      type: String,
      default: '#10B981',
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    admins: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    last_message: {
      text: { type: String, default: '' },
      from_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      from_name: { type: String, default: '' },
      time: { type: Date, default: Date.now },
    },
  },
  { timestamps: true }
);

ChatGroupSchema.index({ members: 1 });
ChatGroupSchema.index({ admins: 1 });
ChatGroupSchema.index({ createdAt: -1 });

export default mongoose.models.ChatGroup || mongoose.model('ChatGroup', ChatGroupSchema);
