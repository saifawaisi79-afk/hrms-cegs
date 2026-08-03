import mongoose from 'mongoose';

const AssetSchema = new mongoose.Schema({
  asset_name:    { type: String, required: true },
  serial_number: { type: String, required: true, unique: true },
  category:      { type: String, required: true },
  status:        { type: String, enum: ['available', 'assigned', 'maintenance'], default: 'available' },
  assigned_to:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  condition:     { type: String, default: 'new' },
  location:      { type: String, default: 'main_office' },
  date_added:    { type: String, default: null },
}, { timestamps: true });

export default mongoose.models.Asset || mongoose.model('Asset', AssetSchema);
