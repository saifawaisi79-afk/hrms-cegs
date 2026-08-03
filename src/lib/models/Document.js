import mongoose from 'mongoose';

const DocumentSchema = new mongoose.Schema({
  user_id:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title:         { type: String, required: true },
  document_type: { type: String, required: true },
  template_name: { type: String, default: null },
  file_path:     { type: String, default: null },
  content:       { type: String, default: null },
  status:        { type: String, enum: ['generated', 'sent', 'signed', 'completed'], default: 'generated' },
  created_at:    { type: String, required: true },
}, { timestamps: true });

export default mongoose.models.Document || mongoose.model('Document', DocumentSchema);
