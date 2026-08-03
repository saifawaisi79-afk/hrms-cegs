import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  employee_id:              { type: String, required: true, unique: true },
  name:                     { type: String, required: true },
  email:                    { type: String, required: true, unique: true },
  password_hash:            { type: String, required: true },
  role:                     { type: String, enum: ['employee', 'admin', 'super_admin'], required: true },
  department_id:            { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },
  reports_to:               { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  designation:              { type: String, default: '' },
  joining_date:             { type: String, default: '' },
  contact:                  { type: String, default: '' },
  status:                   { type: String, enum: ['active', 'inactive', 'on_leave'], default: 'active' },
  basic_salary:             { type: Number, default: 3000 },
  avatar_url:               { type: String, default: '' },
  last_login:               { type: String, default: null },
  emergency_contact:        { type: String, default: '' },
  bank_name:                { type: String, default: '' },
  account_number:           { type: String, default: '' },
  ifsc_code:                { type: String, default: '' },
  must_change_password:     { type: Boolean, default: false },
  temp_password_expires_at: { type: Date, default: null },
  permissions_json:         { type: String, default: null },
}, { timestamps: true });

export default mongoose.models.User || mongoose.model('User', UserSchema);
