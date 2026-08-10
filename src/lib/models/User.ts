import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUser extends Document {
  employee_id: string;
  name: string;
  email: string;
  password_hash: string;
  role: 'employee' | 'admin' | 'super_admin';
  department_id?: mongoose.Types.ObjectId | null;
  reports_to?: mongoose.Types.ObjectId | null;
  designation: string;
  joining_date: string;
  contact: string;
  status: 'active' | 'inactive' | 'on_leave';
  basic_salary: number;
  allowances: number;
  address: string;
  dob: string;
  employment_type: string;
  /** Official daily login start HH:mm (default 10:00; some staff e.g. Raheel 11:00) */
  login_time: string;
  avatar_url: string;
  last_login?: string | null;
  emergency_contact: string;
  bank_name: string;
  account_number: string;
  ifsc_code: string;
  must_change_password: boolean;
  temp_password_expires_at?: Date | null;
  permissions_json?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema<IUser> = new mongoose.Schema({
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
  basic_salary:             { type: Number, default: 30000 },
  allowances:               { type: Number, default: 0 },
  address:                  { type: String, default: '' },
  dob:                      { type: String, default: '' },
  employment_type:          { type: String, default: 'full_time' },
  login_time:               { type: String, default: '10:00' },
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

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;
