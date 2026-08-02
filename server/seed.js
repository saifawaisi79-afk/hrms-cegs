const bcrypt = require('bcryptjs');
const { dbQuery, initDatabase, syncToMongo } = require('./db');

async function seedData() {
  console.log('[Seed] Starting complete database clean & restructure...');

  try {
    // 1. Drop existing tables for fresh clean schema
    await dbQuery.exec('DROP TABLE IF EXISTS candidates');
    await dbQuery.exec('DROP TABLE IF EXISTS onboarding_tasks');
    await dbQuery.exec('DROP TABLE IF EXISTS onboarding_hires');
    await dbQuery.exec('DROP TABLE IF EXISTS timesheets');
    await dbQuery.exec('DROP TABLE IF EXISTS payroll');
    await dbQuery.exec('DROP TABLE IF EXISTS leaves');
    await dbQuery.exec('DROP TABLE IF EXISTS attendance');
    await dbQuery.exec('DROP TABLE IF EXISTS breaks');
    await dbQuery.exec('DROP TABLE IF EXISTS assets');
    await dbQuery.exec('DROP TABLE IF EXISTS expenses');
    await dbQuery.exec('DROP TABLE IF EXISTS documents');
    await dbQuery.exec('DROP TABLE IF EXISTS document_templates');
    await dbQuery.exec('DROP TABLE IF EXISTS notifications');
    await dbQuery.exec('DROP TABLE IF EXISTS roles_permissions');
    await dbQuery.exec('DROP TABLE IF EXISTS system_settings');
    await dbQuery.exec('DROP TABLE IF EXISTS users');
    await dbQuery.exec('DROP TABLE IF EXISTS departments');

    console.log('[Seed] All old tables dropped. Re-initializing schema...');
    await initDatabase();

    // 2. Insert Departments
    const deptMGMT = await dbQuery.run('INSERT INTO departments (name, code, manager_id, budget) VALUES (?, ?, ?, ?)', ['Management', 'DEPT-MGMT', null, 1000000]);
    const deptHR = await dbQuery.run('INSERT INTO departments (name, code, manager_id, budget) VALUES (?, ?, ?, ?)', ['Human Resources', 'DEPT-HR', null, 300000]);
    const deptFin = await dbQuery.run('INSERT INTO departments (name, code, manager_id, budget) VALUES (?, ?, ?, ?)', ['Billing & Finance', 'DEPT-FIN', null, 500000]);

    console.log('[Seed] Departments seeded.');

    // 3. Hash passwords and insert users
    const defaultPasswordHash = await bcrypt.hash('Password123', 10);
    const today = new Date().toISOString().split('T')[0];

    // Users List
    const userSuperAdmin = await dbQuery.run(
      `INSERT INTO users (employee_id, name, email, password_hash, role, department_id, reports_to, designation, joining_date, contact, status, basic_salary, avatar_url, last_login)
       VALUES (?, ?, ?, ?, 'super_admin', ?, ?, ?, ?, ?, 'active', ?, ?, ?)`,
      ['EMP-001', 'CEO SuperAdmin', 'superadmin@cegs.com', defaultPasswordHash, deptMGMT.id, null, 'Chief Executive Officer', '2024-01-15', '+1 212 555 0001', 95000, 'https://api.dicebear.com/7.x/avataaars/svg?seed=ceo', today]
    );

    const userHRManager = await dbQuery.run(
      `INSERT INTO users (employee_id, name, email, password_hash, role, department_id, reports_to, designation, joining_date, contact, status, basic_salary, avatar_url, last_login)
       VALUES (?, ?, ?, ?, 'admin', ?, ?, ?, ?, ?, 'active', ?, ?, ?)`,
      ['EMP-002', 'Nusrath Hussain', 'nusrath@cegs.com', defaultPasswordHash, deptHR.id, userSuperAdmin.id, 'HR Manager', '2024-03-10', '+1 212 555 0002', 30000, 'https://api.dicebear.com/7.x/avataaars/svg?seed=nusrath', today]
    );

    const userDeveloper = await dbQuery.run(
      `INSERT INTO users (employee_id, name, email, password_hash, role, department_id, reports_to, designation, joining_date, contact, status, basic_salary, avatar_url, last_login)
       VALUES (?, ?, ?, ?, 'super_admin', ?, ?, ?, ?, ?, 'active', ?, ?, ?)`,
      ['DEV-001', 'Saif Awaisi', 'saifawaisi79@gmail.com', defaultPasswordHash, deptMGMT.id, null, 'Developer & System Architect', '2024-01-01', '+91 99887 76655', 120000, '/dev_saif.jpg', today]
    );

    const userBilling = await dbQuery.run(
      `INSERT INTO users (employee_id, name, email, password_hash, role, department_id, reports_to, designation, joining_date, contact, status, basic_salary, avatar_url, last_login)
       VALUES (?, ?, ?, ?, 'employee', ?, ?, ?, ?, ?, 'active', ?, ?, ?)`,
      ['EMP-004', 'Mohammed Raheel', 'raheel@careerglobalexpertsolution.com', defaultPasswordHash, deptFin.id, userHRManager.id, 'Billing Specialist', '2026-07-31', '+1 212 555 0004', 35000, 'https://api.dicebear.com/7.x/avataaars/svg?seed=raheel', today]
    );

    const userRecruiterMadiha = await dbQuery.run(
      `INSERT INTO users (employee_id, name, email, password_hash, role, department_id, reports_to, designation, joining_date, contact, status, basic_salary, avatar_url, last_login)
       VALUES (?, ?, ?, ?, 'employee', ?, ?, ?, ?, ?, 'active', ?, ?, ?)`,
      ['EMP-005', 'Madiha Mehak', 'madiha@cegs.com', defaultPasswordHash, deptHR.id, userHRManager.id, 'Senior Recruiter', '2024-08-01', '+91 98765 43210', 25000, 'https://api.dicebear.com/7.x/avataaars/svg?seed=madiha', today]
    );

    const userRecruiterHeena = await dbQuery.run(
      `INSERT INTO users (employee_id, name, email, password_hash, role, department_id, reports_to, designation, joining_date, contact, status, basic_salary, avatar_url, last_login)
       VALUES (?, ?, ?, ?, 'employee', ?, ?, ?, ?, ?, 'active', ?, ?, ?)`,
      ['EMP-006', 'Heena Beagum', 'heena@cegs.com', defaultPasswordHash, deptHR.id, userHRManager.id, 'Recruiter', '2024-08-15', '+91 98765 43211', 25000, 'https://api.dicebear.com/7.x/avataaars/svg?seed=heena', today]
    );

    // Update Departments with managers
    await dbQuery.run('UPDATE departments SET manager_id = ? WHERE id = ?', [userSuperAdmin.id, deptMGMT.id]);
    await dbQuery.run('UPDATE departments SET manager_id = ? WHERE id = ?', [userHRManager.id, deptHR.id]);
    await dbQuery.run('UPDATE departments SET manager_id = ? WHERE id = ?', [userBilling.id, deptFin.id]);

    console.log('[Seed] Official Users & Managers seeded successfully.');

    // 4. Seed Candidates Datasheet (Clean Testing Dummy Data across all 5 recruitment categories)
    const seedCandidatesList = [
      { date: '31/07/2026', name: 'ANANYA SHARMA', number: '9876543210', languages: 'English, Hindi', qualification: 'B.Tech CS', response: 'Connected', callStatus: 'Connected', location: 'Bengaluru', experience: 2, followUp1: 'Connected', followUp2: '', followUp3: '', employee: 'Madiha Mehak' },
      { date: '31/07/2026', name: 'ROHAN VERMA', number: '9876543211', languages: 'English, Kannada', qualification: 'BCA', response: 'Interview Scheduled', callStatus: 'Connected', location: 'Bengaluru', experience: 1, followUp1: 'Interview Scheduled', followUp2: '', followUp3: '', employee: 'Madiha Mehak' },
      { date: '31/07/2026', name: 'PRIYA NAIR', number: '9876543212', languages: 'English, Malayalam', qualification: 'B.Com', response: 'Walk-in Today', callStatus: 'Connected', location: 'Bengaluru', experience: 3, followUp1: 'Interview Scheduled', followUp2: 'Walk-in Today', followUp3: '', employee: 'Madiha Mehak' },
      { date: '31/07/2026', name: 'KARTHIK KUMAR', number: '9876543213', languages: 'English, Tamil', qualification: 'BE Mechanical', response: 'Selected Today', callStatus: 'Connected', location: 'Bengaluru', experience: 4, followUp1: 'Interview Scheduled', followUp2: 'Walk-in Today', followUp3: 'Selected Today', employee: 'Madiha Mehak' },
      { date: '31/07/2026', name: 'AISHA KHAN', number: '9876543214', languages: 'English, Urdu', qualification: 'MBA HR', response: 'Joined Today', callStatus: 'Connected', location: 'Bengaluru', experience: 2, followUp1: 'Interview Scheduled', followUp2: 'Walk-in Today', followUp3: 'Joined Today', employee: 'Madiha Mehak' },
      { date: '31/07/2026', name: 'VIKRAM PATEL', number: '9876543215', languages: 'English, Gujarati', qualification: 'BBA', response: 'Connected', callStatus: 'Connected', location: 'Bengaluru', experience: 1, followUp1: 'Connected', followUp2: '', followUp3: '', employee: 'Madiha Mehak' },
      { date: '31/07/2026', name: 'NEHA SINGH', number: '9876543216', languages: 'English, Hindi', qualification: 'B.Sc IT', response: 'Interview Scheduled', callStatus: 'Connected', location: 'Bengaluru', experience: 3, followUp1: 'Interview Scheduled', followUp2: '', followUp3: '', employee: 'Madiha Mehak' },
      
      { date: '31/07/2026', name: 'SIDDHARTH RAO', number: '9876543217', languages: 'English, Telugu', qualification: 'B.Tech IT', response: 'Connected', callStatus: 'Connected', location: 'Bengaluru', experience: 2, followUp1: 'Connected', followUp2: '', followUp3: '', employee: 'Heena Beagum' },
      { date: '31/07/2026', name: 'TANVI GUPTA', number: '9876543218', languages: 'English, Hindi', qualification: 'M.Com', response: 'Interview Scheduled', callStatus: 'Connected', location: 'Bengaluru', experience: 1, followUp1: 'Interview Scheduled', followUp2: '', followUp3: '', employee: 'Heena Beagum' },
      { date: '31/07/2026', name: 'DEEPAK JOSHI', number: '9876543219', languages: 'English, Marathi', qualification: 'Diploma CS', response: 'Walk-in Today', callStatus: 'Connected', location: 'Bengaluru', experience: 0, followUp1: 'Interview Scheduled', followUp2: 'Walk-in Today', followUp3: '', employee: 'Heena Beagum' },
      
      { date: '31/07/2026', name: 'SAMEER AHMED', number: '9876543220', languages: 'English, Urdu', qualification: 'B.E Electronics', response: 'Connected', callStatus: 'Connected', location: 'Bengaluru', experience: 5, followUp1: 'Connected', followUp2: '', followUp3: '', employee: 'Nusrath Hussain' },
      { date: '31/07/2026', name: 'DIVYA IYER', number: '9876543221', languages: 'English, Tamil', qualification: 'B.Sc Biotech', response: 'Interview Scheduled', callStatus: 'Connected', location: 'Bengaluru', experience: 2, followUp1: 'Interview Scheduled', followUp2: '', followUp3: '', employee: 'Nusrath Hussain' },
    ];

    for (const cand of seedCandidatesList) {
      await dbQuery.run(
        `INSERT INTO candidates (date, name, number, languages, qualification, response, callStatus, location, experience, followUp1, followUp2, followUp3, employee)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [cand.date, cand.name, cand.number, cand.languages, cand.qualification, cand.response, cand.callStatus, cand.location, cand.experience, cand.followUp1, cand.followUp2, cand.followUp3, cand.employee]
      );
    }

    console.log(`[Seed] Successfully seeded ${seedCandidatesList.length} candidate datasheet entries.`);

    // 5. Seed Attendance Logs
    const attendanceDates = ['2026-07-27', '2026-07-28', '2026-07-29', '2026-07-30', '2026-07-31'];
    for (const d of attendanceDates) {
      await dbQuery.run(
        `INSERT INTO attendance (user_id, date, check_in_time, check_out_time, check_in_lat, check_in_lng, status, location_verified, work_hours)
         VALUES (?, ?, '09:00:00', '18:00:00', 12.9716, 77.5946, 'present', 1, 9.0)`,
        [userRecruiterMadiha.id, d]
      );
      await dbQuery.run(
        `INSERT INTO attendance (user_id, date, check_in_time, check_out_time, check_in_lat, check_in_lng, status, location_verified, work_hours)
         VALUES (?, ?, '09:15:00', '18:15:00', 12.9716, 77.5946, 'present', 1, 9.0)`,
        [userRecruiterHeena.id, d]
      );
    }

    console.log('[Seed] Attendance logs seeded.');

    // 6. Seed System Settings & Roles
    await dbQuery.run(
      `INSERT INTO roles_permissions (role_name, permissions_json) VALUES 
       ('super_admin', '{}'),
       ('admin', '{"employees":{"view":true,"create":true,"edit":true,"delete":true,"approve":true},"departments":{"view":true,"create":true,"edit":true,"delete":true},"leaves":{"view":true,"approve":true},"attendance":{"view":true,"edit":true}}'),
       ('employee', '{"employees":{"view":true},"departments":{"view":true},"leaves":{"view":true,"create":true},"attendance":{"view":true,"create":true}}')`
    );

    // DB query writes automatically sync SQLite to MongoDB Atlas!
    console.log('[Seed] Complete database restructuring & seeding finished successfully. Synced to MongoDB Atlas!');

  } catch (err) {
    console.error('[Seed] Error during database restructuring & seeding:', err);
    throw err;
  }
}

// Execute if run directly
if (require.main === module) {
  initDatabase().then(() => {
    seedData().then(() => {
      console.log('Seeding successful.');
      process.exit(0);
    }).catch(err => {
      console.error(err);
      process.exit(1);
    });
  });
}

module.exports = seedData;
