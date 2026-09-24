import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema({
  sender_id:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  recipient_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  department_id:{ type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },
  title:        { type: String, required: true },
  message:      { type: String, required: true },
  is_read:      { type: Boolean, default: false },
  created_at:   { type: String, required: true },
  /** Campaign Hub idempotency — one notice per recipient per award event */
  dedupeKey:    { type: String, default: null },
}, { timestamps: true });

NotificationSchema.index({ dedupeKey: 1 }, { unique: true, sparse: true });

export default mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);
