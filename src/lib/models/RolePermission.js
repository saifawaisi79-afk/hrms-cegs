import mongoose from 'mongoose';

const RolePermissionSchema = new mongoose.Schema({
  role_name:        { type: String, required: true, unique: true },
  permissions_json: { type: String, required: true },
}, { timestamps: true });

export default mongoose.models.RolePermission || mongoose.model('RolePermission', RolePermissionSchema);
