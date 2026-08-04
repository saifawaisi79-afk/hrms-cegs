import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is missing in .env.local');
  process.exit(1);
}

const UserSchema = new mongoose.Schema(
  {
    employee_id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password_hash: { type: String, required: true },
    role: { type: String, enum: ['employee', 'admin', 'super_admin'], required: true },
    status: { type: String, enum: ['active', 'inactive', 'on_leave'], default: 'active' },
    avatar_url: { type: String, default: '' },
    designation: { type: String, default: '' },
    joining_date: { type: String, default: '' },
    contact: { type: String, default: '' },
    must_change_password: { type: Boolean, default: false },
    basic_salary: { type: Number, default: 30000 },
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model('User', UserSchema);

/** Production-style password: Cegs@ + random alphanumerics (matches HR onboarding generator) */
function generatePermanentPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const bytes = crypto.randomBytes(8);
  let pass = 'Cegs@';
  for (let i = 0; i < 4; i++) {
    pass += chars[bytes[i] % chars.length];
  }
  pass += String(100 + (bytes[4] % 900));
  return pass;
}

async function seed() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI as string);
    console.log('✅ Connected to', mongoose.connection.host, '/', mongoose.connection.name);

    console.log('Wiping ALL existing users (old credentials removed)...');
    const deleted = await User.deleteMany({});
    console.log(`✅ Removed ${deleted.deletedCount} user(s).`);

    const bootstrap = [
      {
        employee_id: 'EMP-001',
        name: 'CEO SuperAdmin',
        email: 'superadmin@cegs.com',
        role: 'super_admin' as const,
        designation: 'Chief Executive Officer',
        password: generatePermanentPassword(),
      },
      {
        employee_id: 'EMP-002',
        name: 'Nusrath Hussain',
        email: 'nusrath@cegs.com',
        role: 'admin' as const,
        designation: 'HR Manager',
        password: generatePermanentPassword(),
      },
      {
        employee_id: 'DEV-001',
        name: 'Saif Awaisi',
        email: 'saifawaisi79@gmail.com',
        role: 'super_admin' as const,
        designation: 'Developer & System Architect',
        password: generatePermanentPassword(),
      },
    ];

    console.log('Seeding fresh bootstrap accounts...');
    const docs = [];
    for (const u of bootstrap) {
      const password_hash = await bcrypt.hash(u.password, 10);
      docs.push({
        employee_id: u.employee_id,
        name: u.name,
        email: u.email,
        password_hash,
        role: u.role,
        status: 'active',
        designation: u.designation,
        joining_date: new Date().toISOString().slice(0, 10),
        avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(u.name)}`,
        must_change_password: false,
        basic_salary: u.role === 'super_admin' ? 95000 : 30000,
      });
    }

    await User.insertMany(docs);

    console.log('');
    console.log('================================================');
    console.log(' FRESH LOGIN CREDENTIALS (save securely once)');
    console.log('================================================');
    for (const u of bootstrap) {
      console.log(`  ${u.role.padEnd(12)} | ${u.email}`);
      console.log(`               | password: ${u.password}`);
      console.log('------------------------------------------------');
    }
    console.log('HR Admin can onboard more employees from:');
    console.log('  Campaign / HR → Employee Onboarding & Directory');
    console.log('================================================');
    console.log('');
    console.log('✅ Seed complete. Old passwords no longer work.');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
    process.exit(process.exitCode || 0);
  }
}

seed();
