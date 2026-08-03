import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is missing in .env.local');
  process.exit(1);
}

const UserSchema = new mongoose.Schema({
  employee_id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password_hash: { type: String, required: true },
  role: { type: String, enum: ['employee', 'admin', 'super_admin'], required: true },
  status: { type: String, enum: ['active', 'inactive', 'on_leave'], default: 'active' },
  avatar_url: { type: String, default: '' },
  designation: { type: String, default: '' },
});

const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function seed() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI as string);
    console.log('✅ Connected.');

    console.log('Wiping existing users...');
    await User.deleteMany({});
    console.log('✅ Users wiped.');

    const adminHash = await bcrypt.hash('password123', 10);
    const saifHash = await bcrypt.hash('password123', 10);

    const usersToCreate = [
      {
        employee_id: 'EMP-001',
        name: 'CEO SuperAdmin',
        email: 'superadmin@cegs.com',
        password_hash: adminHash,
        role: 'super_admin' as const,
        status: 'active' as const,
        designation: 'Chief Executive Officer',
        avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ceo'
      },
      {
        employee_id: 'DEV-001',
        name: 'Saif Awaisi',
        email: 'saifawaisi79@gmail.com',
        password_hash: saifHash,
        role: 'super_admin' as const,
        status: 'active' as const,
        designation: 'Developer & System Architect',
        avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=saif'
      }
    ];

    console.log('Seeding fresh admin users...');
    await User.insertMany(usersToCreate);
    console.log('✅ Users seeded successfully!');
    console.log('------------------------------------------------');
    console.log('You can now log in with:');
    console.log('Email: saifawaisi79@gmail.com');
    console.log('Password: password123');
    console.log('------------------------------------------------');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
    process.exit(0);
  }
}

seed();
