import mongoose from 'mongoose';

const DocumentTemplateSchema = new mongoose.Schema({
  name:          { type: String, required: true, unique: true },
  subject:       { type: String, required: true },
  body_template: { type: String, required: true },
}, { timestamps: true });

export default mongoose.models.DocumentTemplate || mongoose.model('DocumentTemplate', DocumentTemplateSchema);
