const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'database.sqlite');
let db = null;
let mongoClient = null;
let mongoDb = null;

// Load env variables
require('dotenv').config();

// Function to handle MongoDB connection and SQLite file syncing
async function connectDatabase() {
  if (db) return; // Already connected

  const mongoUri = process.env.MONGODB_URI;

  if (mongoUri) {
    console.log('[MongoDB Connect] Attempting to connect to MongoDB...');
    const { MongoClient } = require('mongodb');
    try {
      mongoClient = new MongoClient(mongoUri);
      await mongoClient.connect();
      mongoDb = mongoClient.db();
      console.log('[MongoDB Connect] Connected to MongoDB:', mongoDb.databaseName);

      // Try to retrieve database binary from collection 'cegs_db'
      const doc = await mongoDb.collection('cegs_db').findOne({ _id: 'sqlite_database' });
      if (doc && doc.data) {
        console.log('[MongoDB Connect] Existing database backup found in MongoDB. Loading binary...');
        const buffer = doc.data.buffer || doc.data;
        fs.writeFileSync(dbPath, buffer);
        console.log('[MongoDB Connect] Database file written locally.');
      } else {
        console.log('[MongoDB Connect] No database backup found. Starting fresh SQLite file.');
      }
    } catch (err) {
      console.error('[MongoDB Connect] Failed to connect or download backup. Operating locally.', err);
    }
  } else {
    console.log('[MongoDB Connect] MONGODB_URI not found in environment variables. Operating locally.');
  }

  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Failed to open SQLite database connection:', err);
        reject(err);
      } else {
        console.log('Opened SQLite database connection.');
        resolve();
      }
    });
  });
}

// Function to sync local SQLite file back to MongoDB
async function syncToMongo() {
  if (!mongoDb) return;
  try {
    if (!fs.existsSync(dbPath)) return;
    const data = fs.readFileSync(dbPath);
    await mongoDb.collection('cegs_db').updateOne(
      { _id: 'sqlite_database' },
      { $set: { data: data, updatedAt: new Date() } },
      { upsert: true }
    );
    console.log('[MongoDB Sync] SQLite database synced to cloud Atlas successfully.');
  } catch (err) {
    console.error('[MongoDB Sync] Error uploading database binary to MongoDB:', err);
  }
}

// Helper promise-based database functions
const dbQuery = {
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      if (!db) return reject(new Error('Database not initialized.'));
      db.run(sql, params, async function (err) {
        if (err) {
          reject(err);
        } else {
          try {
            await syncToMongo();
            resolve({ id: this.lastID, changes: this.changes });
          } catch (syncErr) {
            console.error('Sync failed, but SQL executed:', syncErr);
            resolve({ id: this.lastID, changes: this.changes });
          }
        }
      });
    });
  },
  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      if (!db) return reject(new Error('Database not initialized.'));
      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },
  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      if (!db) return reject(new Error('Database not initialized.'));
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },
  exec(sql) {
    return new Promise((resolve, reject) => {
      if (!db) return reject(new Error('Database not initialized.'));
      db.exec(sql, async (err) => {
        if (err) {
          reject(err);
        } else {
          try {
            await syncToMongo();
            resolve();
          } catch (syncErr) {
            console.error('Sync failed, but SQL executed:', syncErr);
            resolve();
          }
        }
      });
    });
  }
};

// Initialize schema
async function initDatabase() {
  // Connect database and pull from Mongo first if needed
  await connectDatabase();

  console.log('Initializing SQLite database schema...');

  // 1. Departments Table
  await dbQuery.exec(`
    CREATE TABLE IF NOT EXISTS departments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      code TEXT UNIQUE NOT NULL,
      manager_id INTEGER,
      budget REAL DEFAULT 0
    )
  `);

  // 2. Users Table
  await dbQuery.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT CHECK(role IN ('employee', 'admin', 'super_admin')) NOT NULL,
      department_id INTEGER,
      reports_to INTEGER,
      designation TEXT,
      joining_date TEXT,
      contact TEXT,
      status TEXT CHECK(status IN ('active', 'inactive', 'on_leave')) DEFAULT 'active',
      basic_salary REAL DEFAULT 3000,
      avatar_url TEXT,
      last_login TEXT,
      emergency_contact TEXT,
      bank_name TEXT,
      account_number TEXT,
      ifsc_code TEXT,
      FOREIGN KEY (department_id) REFERENCES departments(id),
      FOREIGN KEY (reports_to) REFERENCES users(id)
    )
  `);

  // 3. Leaves Table
  await dbQuery.exec(`
    CREATE TABLE IF NOT EXISTS leaves (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      leave_type TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      reason TEXT,
      status TEXT CHECK(status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
      applied_date TEXT NOT NULL,
      approved_by INTEGER,
      rejection_reason TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (approved_by) REFERENCES users(id)
    )
  `);

  // 4. Attendance Table
  await dbQuery.exec(`
    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      check_in_time TEXT,
      check_out_time TEXT,
      check_in_lat REAL,
      check_in_lng REAL,
      status TEXT CHECK(status IN ('present', 'late', 'absent')) DEFAULT 'present',
      location_verified INTEGER DEFAULT 0,
      work_hours REAL DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(user_id, date)
    )
  `);

  // 5. Payroll Table
  await dbQuery.exec(`
    CREATE TABLE IF NOT EXISTS payroll (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      month INTEGER NOT NULL,
      year INTEGER NOT NULL,
      basic_salary REAL NOT NULL,
      allowances REAL DEFAULT 0,
      overtime REAL DEFAULT 0,
      bonus REAL DEFAULT 0,
      deductions REAL DEFAULT 0,
      net_salary REAL NOT NULL,
      status TEXT CHECK(status IN ('processed', 'draft')) DEFAULT 'draft',
      processed_date TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(user_id, month, year)
    )
  `);

  // 6. Timesheets Table
  await dbQuery.exec(`
    CREATE TABLE IF NOT EXISTS timesheets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      start_time TEXT,
      end_time TEXT,
      duration REAL DEFAULT 0,
      project TEXT NOT NULL,
      task TEXT NOT NULL,
      status TEXT CHECK(status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
      approved_by INTEGER,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (approved_by) REFERENCES users(id)
    )
  `);

  // 7. Assets Table
  await dbQuery.exec(`
    CREATE TABLE IF NOT EXISTS assets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      asset_name TEXT NOT NULL,
      serial_number TEXT UNIQUE NOT NULL,
      category TEXT NOT NULL,
      status TEXT CHECK(status IN ('available', 'assigned', 'maintenance')) DEFAULT 'available',
      assigned_to INTEGER,
      condition TEXT,
      location TEXT,
      date_added TEXT,
      FOREIGN KEY (assigned_to) REFERENCES users(id)
    )
  `);

  // 8. Expenses Table
  await dbQuery.exec(`
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      receipt_url TEXT,
      status TEXT CHECK(status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
      approved_by INTEGER,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (approved_by) REFERENCES users(id)
    )
  `);

  // 9. Documents Table
  await dbQuery.exec(`
    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      document_type TEXT NOT NULL,
      template_name TEXT,
      file_path TEXT,
      status TEXT CHECK(status IN ('generated', 'sent', 'signed', 'completed')) DEFAULT 'generated',
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // 10. Document Templates Table
  await dbQuery.exec(`
    CREATE TABLE IF NOT EXISTS document_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      subject TEXT NOT NULL,
      body_template TEXT NOT NULL
    )
  `);

  // 11. Onboarding Hires Table
  await dbQuery.exec(`
    CREATE TABLE IF NOT EXISTS onboarding_hires (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      position TEXT NOT NULL,
      start_date TEXT NOT NULL,
      progress_percent INTEGER DEFAULT 0,
      status TEXT CHECK(status IN ('in_progress', 'completed')) DEFAULT 'in_progress',
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // 12. Onboarding Tasks Table
  await dbQuery.exec(`
    CREATE TABLE IF NOT EXISTS onboarding_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hire_id INTEGER NOT NULL,
      task_name TEXT NOT NULL,
      is_completed INTEGER CHECK(is_completed IN (0, 1)) DEFAULT 0,
      role_specific TEXT NOT NULL,
      FOREIGN KEY (hire_id) REFERENCES onboarding_hires(id)
    )
  `);

  // 13. Notifications Table
  await dbQuery.exec(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_id INTEGER,
      recipient_id INTEGER,
      department_id INTEGER,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      is_read INTEGER CHECK(is_read IN (0, 1)) DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (sender_id) REFERENCES users(id),
      FOREIGN KEY (recipient_id) REFERENCES users(id),
      FOREIGN KEY (department_id) REFERENCES departments(id)
    )
  `);

  // 14. Roles Permissions Table
  await dbQuery.exec(`
    CREATE TABLE IF NOT EXISTS roles_permissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role_name TEXT UNIQUE NOT NULL,
      permissions_json TEXT NOT NULL
    )
  `);

  // 15. System Settings Table
  await dbQuery.exec(`
    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  console.log('Database tables successfully verified/created.');
}

module.exports = {
  db,
  dbQuery,
  initDatabase
};
