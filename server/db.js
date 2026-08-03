const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Load env variables
require('dotenv').config();

const dbPath = process.env.VERCEL || process.env.NOW_REGION
  ? '/tmp/database.sqlite'
  : path.join(__dirname, 'database.sqlite');

let db = null;
let mongoClient = null;
let mongoDb = null;
let syncPending = false;
let syncTimer = null;

// ─────────────────────────────────────────────────────────────────────────────
// ROBUST MONGODB CONNECTION with full TLS options for OpenSSL 3.x + Node 26+
// ─────────────────────────────────────────────────────────────────────────────
async function createMongoClient(uri) {
  const { MongoClient } = require('mongodb');

  // Try Option 1: Standard connection (works on most systems)
  try {
    const client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 15000,
      connectTimeoutMS: 15000,
      socketTimeoutMS: 30000,
    });
    await client.connect();
    return client;
  } catch (err1) {
    console.warn('[MongoDB] Standard TLS failed, trying with tlsAllowInvalidCertificates...', err1.message.slice(0, 80));
  }

  // Try Option 2: Relaxed TLS (for OpenSSL 3.x compatibility issues)
  try {
    const { MongoClient: MC2 } = require('mongodb');
    const client2 = new MC2(uri, {
      serverSelectionTimeoutMS: 15000,
      connectTimeoutMS: 15000,
      socketTimeoutMS: 30000,
      tls: true,
      tlsAllowInvalidCertificates: true,
      tlsAllowInvalidHostnames: true,
    });
    await client2.connect();
    console.warn('[MongoDB] Connected with relaxed TLS (tlsAllowInvalidCertificates=true)');
    return client2;
  } catch (err2) {
    console.warn('[MongoDB] Relaxed TLS also failed:', err2.message.slice(0, 80));
  }

  // Try Option 3: Append directConnection and authSource
  try {
    const { MongoClient: MC3 } = require('mongodb');
    const uriWithOptions = uri.includes('?')
      ? `${uri}&tlsInsecure=true`
      : `${uri}?tlsInsecure=true`;
    const client3 = new MC3(uriWithOptions, {
      serverSelectionTimeoutMS: 15000,
      connectTimeoutMS: 15000,
    });
    await client3.connect();
    console.warn('[MongoDB] Connected with tlsInsecure=true URI param');
    return client3;
  } catch (err3) {
    console.error('[MongoDB] All TLS options failed. Last error:', err3.message.slice(0, 120));
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CONNECT: Downloads existing SQLite binary from MongoDB Atlas on startup
// ─────────────────────────────────────────────────────────────────────────────
async function connectDatabase() {
  if (db) return; // Already connected

  const mongoUri = process.env.MONGODB_URI;

  if (mongoUri) {
    console.log('[MongoDB Connect] Attempting to connect to MongoDB Atlas...');
    try {
      mongoClient = await createMongoClient(mongoUri);
      if (mongoClient) {
        mongoDb = mongoClient.db();
        console.log('[MongoDB Connect] Connected to MongoDB:', mongoDb.databaseName);

        // Try to retrieve database binary from collection 'cegs_db'
        const doc = await mongoDb.collection('cegs_db').findOne({ _id: 'sqlite_database' });
        if (doc && doc.data) {
          console.log('[MongoDB Connect] Existing database backup found in MongoDB. Loading binary...');
          const buffer = doc.data.buffer || doc.data;
          fs.writeFileSync(dbPath, buffer);
          console.log('[MongoDB Connect] Database file written locally. Size:', buffer.length, 'bytes');
        } else {
          console.log('[MongoDB Connect] No database backup found. Starting fresh SQLite file.');
        }
      } else {
        console.warn('[MongoDB Connect] Could not establish MongoDB connection. Running in local-only mode.');
      }
    } catch (err) {
      console.error('[MongoDB Connect] Failed to connect or download backup. Operating locally.', err.message);
    }
  } else {
    console.log('[MongoDB Connect] MONGODB_URI not found. Operating locally.');
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

// ─────────────────────────────────────────────────────────────────────────────
// SYNC: Uploads SQLite binary to MongoDB Atlas — DEBOUNCED & NON-BLOCKING
// Uses a 500ms debounce so rapid writes don't spam the network
// ─────────────────────────────────────────────────────────────────────────────
function scheduleSyncToMongo() {
  if (!mongoDb) return; // No MongoDB connection, skip

  // Clear any pending sync timer
  if (syncTimer) clearTimeout(syncTimer);

  // Mark sync as pending
  syncPending = true;

  // Debounce: wait 500ms after the last write before syncing
  syncTimer = setTimeout(async () => {
    syncPending = false;
    syncTimer = null;
    await syncToMongo();
  }, 500);
}

async function syncToMongo() {
  if (!mongoDb) return;
  try {
    if (!fs.existsSync(dbPath)) {
      console.warn('[MongoDB Sync] SQLite file not found, skipping sync.');
      return;
    }

    const data = fs.readFileSync(dbPath);

    await mongoDb.collection('cegs_db').updateOne(
      { _id: 'sqlite_database' },
      { $set: { data: data, updatedAt: new Date() } },
      { upsert: true }
    );

    console.log('[MongoDB Sync] ✓ SQLite database synced to MongoDB Atlas successfully. Size:', data.length, 'bytes');
  } catch (err) {
    console.error('[MongoDB Sync] ✗ Error uploading to MongoDB Atlas:', err.message);

    // If the connection was lost, try to reconnect once
    if (err.message && (err.message.includes('topology') || err.message.includes('connection') || err.message.includes('SSL') || err.message.includes('TLS'))) {
      console.log('[MongoDB Sync] Attempting MongoDB reconnection...');
      try {
        const mongoUri = process.env.MONGODB_URI;
        if (mongoUri) {
          if (mongoClient) {
            try { await mongoClient.close(); } catch {}
          }
          mongoClient = await createMongoClient(mongoUri);
          if (mongoClient) {
            mongoDb = mongoClient.db();
            console.log('[MongoDB Sync] Reconnected. Retrying sync...');
            await syncToMongo(); // Retry once after reconnect
          }
        }
      } catch (reconnErr) {
        console.error('[MongoDB Sync] Reconnection failed:', reconnErr.message);
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PERIODIC SYNC: Backup every 30 seconds regardless of writes
// ─────────────────────────────────────────────────────────────────────────────
function startPeriodicSync(intervalMs = 30000) {
  setInterval(async () => {
    if (!syncPending && mongoDb) {
      await syncToMongo();
    }
  }, intervalMs);
  console.log('[MongoDB Sync] Periodic sync enabled every', intervalMs / 1000, 'seconds.');
}

// ─────────────────────────────────────────────────────────────────────────────
// QUERY HELPERS: Promise-based wrappers around sqlite3 callbacks
// ─────────────────────────────────────────────────────────────────────────────
const dbQuery = {
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      if (!db) return reject(new Error('Database not initialized.'));
      db.run(sql, params, function (err) {
        if (err) {
          reject(err);
        } else {
          const result = { id: this.lastID, changes: this.changes };
          // Schedule async (non-blocking) sync to MongoDB
          scheduleSyncToMongo();
          resolve(result);
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
      db.exec(sql, (err) => {
        if (err) {
          reject(err);
        } else {
          // Schedule async (non-blocking) sync to MongoDB
          scheduleSyncToMongo();
          resolve();
        }
      });
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// INIT DATABASE: Creates all tables if they don't exist
// ─────────────────────────────────────────────────────────────────────────────
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
      dob TEXT,
      address TEXT,
      employment_type TEXT DEFAULT 'full_time',
      must_change_password INTEGER DEFAULT 1,
      temp_password_expires_at TEXT,
      FOREIGN KEY (department_id) REFERENCES departments(id),
      FOREIGN KEY (reports_to) REFERENCES users(id)
    )
  `);

  // Safely add missing columns to existing users table if migrating
  const userCols = ['dob', 'address', 'employment_type', 'must_change_password', 'temp_password_expires_at'];
  for (const col of userCols) {
    try {
      if (col === 'must_change_password') {
        await dbQuery.exec(`ALTER TABLE users ADD COLUMN must_change_password INTEGER DEFAULT 0`);
      } else {
        await dbQuery.exec(`ALTER TABLE users ADD COLUMN ${col} TEXT`);
      }
    } catch (colErr) {
      // Column already exists — ignore
    }
  }

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
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      value TEXT NOT NULL
    )
  `);

  // 16. Candidates Table
  await dbQuery.exec(`
    CREATE TABLE IF NOT EXISTS candidates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT,
      name TEXT,
      number TEXT,
      languages TEXT,
      qualification TEXT,
      response TEXT,
      callStatus TEXT,
      location TEXT,
      experience INTEGER DEFAULT 0,
      followUp1 TEXT,
      followUp2 TEXT,
      followUp3 TEXT,
      employee TEXT
    )
  `);

  // 17. Audit Logs Table
  await dbQuery.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_id INTEGER NOT NULL,
      admin_name TEXT NOT NULL,
      action TEXT NOT NULL,
      target_user_id INTEGER NOT NULL,
      details_json TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (admin_id) REFERENCES users(id),
      FOREIGN KEY (target_user_id) REFERENCES users(id)
    )
  `);

  // 18. IT Support Tickets Table
  await dbQuery.exec(`
    CREATE TABLE IF NOT EXISTS it_tickets (
      id TEXT PRIMARY KEY,
      employee_id INTEGER NOT NULL,
      category TEXT NOT NULL,
      priority TEXT CHECK(priority IN ('Low', 'Medium', 'High', 'Critical')) NOT NULL DEFAULT 'Medium',
      status TEXT CHECK(status IN ('Open', 'In Progress', 'On Hold', 'Resolved', 'Closed')) NOT NULL DEFAULT 'Open',
      subject TEXT NOT NULL,
      description TEXT NOT NULL,
      assignee_id INTEGER,
      attachment_url TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      resolved_at TEXT,
      sla_due_at TEXT NOT NULL,
      FOREIGN KEY (employee_id) REFERENCES users(id),
      FOREIGN KEY (assignee_id) REFERENCES users(id)
    )
  `);

  // 19. IT Ticket Messages & Internal Notes Table
  await dbQuery.exec(`
    CREATE TABLE IF NOT EXISTS it_ticket_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id TEXT NOT NULL,
      sender_id INTEGER NOT NULL,
      sender_role TEXT NOT NULL,
      body TEXT NOT NULL,
      attachment_url TEXT,
      visibility TEXT CHECK(visibility IN ('public', 'internal_note')) NOT NULL DEFAULT 'public',
      created_at TEXT NOT NULL,
      FOREIGN KEY (ticket_id) REFERENCES it_tickets(id) ON DELETE CASCADE,
      FOREIGN KEY (sender_id) REFERENCES users(id)
    )
  `);

  // 20. IT Assets Table
  await dbQuery.exec(`
    CREATE TABLE IF NOT EXISTS it_assets (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT CHECK(type IN ('Laptop', 'Accessory', 'Software License', 'Mobile Device', 'Other')) NOT NULL,
      serial_number TEXT,
      assigned_to INTEGER,
      issued_on TEXT,
      status TEXT CHECK(status IN ('Active', 'In Stock', 'Under Maintenance', 'Retired')) NOT NULL DEFAULT 'In Stock',
      notes TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (assigned_to) REFERENCES users(id)
    )
  `);

  // 21. IT Knowledge Base Articles Table
  await dbQuery.exec(`
    CREATE TABLE IF NOT EXISTS it_kb_articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      category TEXT NOT NULL,
      views INTEGER DEFAULT 0,
      helpful_count INTEGER DEFAULT 0,
      created_by INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);

  console.log('Database tables successfully verified/created.');

  // Start periodic sync after init
  startPeriodicSync(30000);

  // Immediately sync current state to MongoDB
  await syncToMongo();
}

module.exports = {
  db,
  dbQuery,
  initDatabase,
  syncToMongo,
};
