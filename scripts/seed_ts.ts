// @ts-nocheck — standalone seed script (not part of Next app types)
/**
 * Bootstrap Super Admin only (does NOT wipe onboarded employees).
 * Use when you need to restore SA access without deleting real users.
 *
 * Run: npx tsx scripts/seed_ts.ts
 */
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

const SAMPLE_REMOVE_EMAILS = ['nusrath@cegs.com', 'superadmin@cegs.com', 'employee@cegs.com'];

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

    const removed = await User.deleteMany({ email: { $in: SAMPLE_REMOVE_EMAILS } });
    console.log(`Removed ${removed.deletedCount} sample account(s) (HR demo / CEO demo / employee demo).`);

    const bootstrap = [
      {
        employee_id: 'DEV-001',
        name: 'Saif Awaisi',
        email: 'saifawaisi79@gmail.com',
        role: 'super_admin' as const,
        designation: 'Developer & System Architect',
        password: generatePermanentPassword(),
      },
    ];

    for (const u of bootstrap) {
      const existing = await User.findOne({ email: u.email });
      if (existing) {
        console.log(`Super Admin already exists: ${u.email} (password not changed).`);
        continue;
      }
      const password_hash = await bcrypt.hash(u.password, 10);
      await User.create({
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
        basic_salary: 95000,
      });
      console.log(`Created Super Admin: ${u.email} | password: ${u.password}`);
    }

    const total = await User.countDocuments();
    console.log(`\n✅ Done. ${total} user(s) in database (includes onboarded employees).`);
    console.log('Onboard HR Admin with Admin role from Campaign → Onboarding if needed.');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    process.exit(process.exitCode || 0);
  }
}

seed();
