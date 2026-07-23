const bcrypt = require('bcryptjs');
const { dbQuery, initDatabase } = require('./db');

async function seedData() {
  console.log('Starting seed operations...');

  try {
    // 1. Drop existing tables to recreate with updated schemas
    await dbQuery.exec('DROP TABLE IF EXISTS onboarding_tasks');
    await dbQuery.exec('DROP TABLE IF EXISTS onboarding_hires');
    await dbQuery.exec('DROP TABLE IF EXISTS timesheets');
    await dbQuery.exec('DROP TABLE IF EXISTS payroll');
    await dbQuery.exec('DROP TABLE IF EXISTS leaves');
    await dbQuery.exec('DROP TABLE IF EXISTS attendance');
    await dbQuery.exec('DROP TABLE IF EXISTS assets');
    await dbQuery.exec('DROP TABLE IF EXISTS expenses');
    await dbQuery.exec('DROP TABLE IF EXISTS documents');
    await dbQuery.exec('DROP TABLE IF EXISTS document_templates');
    await dbQuery.exec('DROP TABLE IF EXISTS notifications');
    await dbQuery.exec('DROP TABLE IF EXISTS roles_permissions');
    await dbQuery.exec('DROP TABLE IF EXISTS system_settings');
    await dbQuery.exec('DROP TABLE IF EXISTS users');
    await dbQuery.exec('DROP TABLE IF EXISTS departments');

    console.log('Existing tables dropped. Re-initializing schema...');
    await initDatabase();

    // 2. Insert Departments
    const deptMGMT = await dbQuery.run(
      'INSERT INTO departments (name, code, manager_id, budget) VALUES (?, ?, ?, ?)',
      ['Management', 'DEPT-MGMT', null, 1000000]
    );
    const deptHR = await dbQuery.run(
      'INSERT INTO departments (name, code, manager_id, budget) VALUES (?, ?, ?, ?)',
      ['Human Resources', 'DEPT-HR', null, 300000]
    );
    const deptFin = await dbQuery.run(
      'INSERT INTO departments (name, code, manager_id, budget) VALUES (?, ?, ?, ?)',
      ['Billing & Finance', 'DEPT-FIN', null, 500000]
    );

    console.log('Departments seeded.');

    // 3. Hash passwords and insert users
    const defaultPasswordHash = await bcrypt.hash('Password123', 10);
    const today = new Date().toISOString().split('T')[0];

    // Super Admin User
    const superAdmin = await dbQuery.run(
      `INSERT INTO users (employee_id, name, email, password_hash, role, department_id, reports_to, designation, joining_date, contact, status, basic_salary, avatar_url, last_login)
       VALUES (?, ?, ?, ?, 'super_admin', ?, ?, ?, ?, ?, 'active', ?, ?, ?)`,
      [
        'EMP-001', 'CEO SuperAdmin', 'superadmin@cegs.com', defaultPasswordHash,
        deptMGMT.id, null, 'Chief Executive Officer', '2024-01-15', '+1234567890',
        95000, 'https://api.dicebear.com/7.x/avataaars/svg?seed=CEO', today
      ]
    );

    // Admin (HR Manager) User
    const hrAdmin = await dbQuery.run(
      `INSERT INTO users (employee_id, name, email, password_hash, role, department_id, reports_to, designation, joining_date, contact, status, basic_salary, avatar_url, last_login, emergency_contact, bank_name, account_number, ifsc_code)
       VALUES (?, ?, ?, ?, 'admin', ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?, ?)`,
      [
        'EMP-002', 'Nusrath Hussain', 'nusrath@cegs.com', defaultPasswordHash,
        deptHR.id, superAdmin.id, 'HR Manager', '2024-03-10', '+1987654321',
        30000, 'https://api.dicebear.com/7.x/avataaars/svg?seed=nusrath', today,
        '+1 212 555 9902', 'CEGS Bank', '8899001122', 'CEGS0000123'
      ]
    );

    // Update Departments with managers
    await dbQuery.run('UPDATE departments SET manager_id = ? WHERE id = ?', [superAdmin.id, deptMGMT.id]);
    await dbQuery.run('UPDATE departments SET manager_id = ? WHERE id = ?', [hrAdmin.id, deptHR.id]);

    // Standard Employee Users
    const emp1 = await dbQuery.run(
      `INSERT INTO users (employee_id, name, email, password_hash, role, department_id, reports_to, designation, joining_date, contact, status, basic_salary, avatar_url, last_login, emergency_contact, bank_name, account_number, ifsc_code)
       VALUES (?, ?, ?, ?, 'employee', ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?, ?)`,
      [
        'EMP-003', 'Madiha Mehak', 'madiha@cegs.com', defaultPasswordHash,
        deptHR.id, hrAdmin.id, 'Recruiter', '2024-06-01', '+1555666777',
        20000, 'https://api.dicebear.com/7.x/avataaars/svg?seed=madiha', today,
        '+1 212 555 9903', 'Chase Bank', '1122334455', 'CHASUS33'
      ]
    );

    const emp2 = await dbQuery.run(
      `INSERT INTO users (employee_id, name, email, password_hash, role, department_id, reports_to, designation, joining_date, contact, status, basic_salary, avatar_url, last_login, emergency_contact, bank_name, account_number, ifsc_code)
       VALUES (?, ?, ?, ?, 'employee', ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?, ?)`,
      [
        'EMP-004', 'Heena Beagum', 'heena@cegs.com', defaultPasswordHash,
        deptFin.id, superAdmin.id, 'Billing Manager', '2024-08-15', '+1555888999',
        25000, 'https://api.dicebear.com/7.x/avataaars/svg?seed=heena', today,
        '+1 212 555 9904', 'Bank of America', '2233445566', 'BOFAUS33'
      ]
    );

    const emp3 = await dbQuery.run(
      `INSERT INTO users (employee_id, name, email, password_hash, role, department_id, reports_to, designation, joining_date, contact, status, basic_salary, avatar_url, last_login, emergency_contact, bank_name, account_number, ifsc_code)
       VALUES (?, ?, ?, ?, 'employee', ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?, ?)`,
      [
        'EMP-005', 'Madhavi', 'madhavi@cegs.com', defaultPasswordHash,
        deptHR.id, hrAdmin.id, 'Recruiter', '2024-11-20', '+1555222333',
        15000, 'https://api.dicebear.com/7.x/avataaars/svg?seed=madhavi', today,
        '+1 212 555 9905', 'Wells Fargo', '5566778899', 'WFCUS33'
      ]
    );

    const emp4 = await dbQuery.run(
      `INSERT INTO users (employee_id, name, email, password_hash, role, department_id, reports_to, designation, joining_date, contact, status, basic_salary, avatar_url, last_login, emergency_contact, bank_name, account_number, ifsc_code)
       VALUES (?, ?, ?, ?, 'employee', ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?, ?)`,
      [
        'EMP-006', 'Mohammed Raheel', 'raheel@cegs.com', defaultPasswordHash,
        deptFin.id, emp2.id, 'Billing', '2025-01-08', '+1555333444',
        25000, 'https://api.dicebear.com/7.x/avataaars/svg?seed=raheel', today,
        '+1 212 555 9906', 'CitiBank', '6677889900', 'CITIUS33'
      ]
    );

    const emp5 = await dbQuery.run(
      `INSERT INTO users (employee_id, name, email, password_hash, role, department_id, reports_to, designation, joining_date, contact, status, basic_salary, avatar_url, last_login, emergency_contact, bank_name, account_number, ifsc_code)
       VALUES (?, ?, ?, ?, 'employee', ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?, ?)`,
      [
        'EMP-007', 'Haseeb', 'haseeb@cegs.com', defaultPasswordHash,
        deptFin.id, emp2.id, 'Billing', '2025-02-15', '+1555444555',
        15000, 'https://api.dicebear.com/7.x/avataaars/svg?seed=haseeb', today,
        '+1 212 555 9907', 'Chase Bank', '7788990011', 'CHASUS33'
      ]
    );

    console.log('Users seeded.');

    // 4. Seed Leave Requests
    await dbQuery.run(
      `INSERT INTO leaves (user_id, leave_type, start_date, end_date, reason, status, applied_date, approved_by)
       VALUES (?, 'vacation', ?, ?, 'Family vacation', 'approved', ?, ?)`,
      [emp3.id, '2026-07-10', '2026-07-20', '2026-07-01', hrAdmin.id]
    );

    await dbQuery.run(
      `INSERT INTO leaves (user_id, leave_type, start_date, end_date, reason, status, applied_date)
       VALUES (?, 'sick', '2026-07-15', '2026-07-16', 'Medical checkup', 'pending', ?)`
      , [emp1.id, '2026-07-12']
    );

    await dbQuery.run(
      `INSERT INTO leaves (user_id, leave_type, start_date, end_date, reason, status, applied_date, approved_by, rejection_reason)
       VALUES (?, 'personal', '2026-06-05', '2026-06-06', 'Moving apartments', 'rejected', ?, ?, 'Peak campaign period')`,
      [emp2.id, '2026-06-01', hrAdmin.id]
    );

    console.log('Leaves seeded.');

    // 5. Seed Attendance Logs
    const dates = ['2026-07-06', '2026-07-07', '2026-07-08', '2026-07-09', '2026-07-10', '2026-07-13'];
    for (const d of dates) {
      await dbQuery.run(
        `INSERT OR IGNORE INTO attendance (user_id, date, check_in_time, check_out_time, check_in_lat, check_in_lng, status, location_verified, work_hours)
         VALUES (?, ?, '08:45:00', '17:00:00', 37.7749, -122.4194, 'present', 1, 8.25)`,
        [emp1.id, d]
      );
      await dbQuery.run(
        `INSERT OR IGNORE INTO attendance (user_id, date, check_in_time, check_out_time, check_in_lat, check_in_lng, status, location_verified, work_hours)
         VALUES (?, ?, '08:50:00', '17:30:00', 37.7749, -122.4194, 'present', 1, 8.67)`,
        [emp2.id, d]
      );
    }

    console.log('Attendance seeded.');

    // 6. Seed Timesheets
    await dbQuery.run(
      `INSERT INTO timesheets (user_id, date, start_time, end_time, duration, project, task, status, approved_by)
       VALUES (?, '2026-07-09', '09:00:00', '17:00:00', 8.0, 'HR Recruitment', 'Screened resumes for backend developers', 'approved', ?)`,
      [emp1.id, hrAdmin.id]
    );

    // 6. Seed Timesheets
    await dbQuery.run(
      `INSERT INTO timesheets (user_id, date, start_time, end_time, duration, project, task, status, approved_by)
       VALUES (?, '2026-07-09', '09:00:00', '17:00:00', 8.0, 'HR Recruitment', 'Screened resumes for backend developers', 'approved', ?)`,
      [emp1.id, hrAdmin.id]
    );

    // 6. Seed Timesheets
    await dbQuery.run(
      `INSERT INTO timesheets (user_id, date, start_time, end_time, duration, project, task, status, approved_by)
       VALUES (?, '2026-07-09', '09:00:00', '17:00:00', 8.0, 'Project Jupiter', 'Implemented authentication API controllers and middleware', 'approved', ?)`,
      [emp1.id, hrAdmin.id]
    );

    await dbQuery.run(
      `INSERT INTO timesheets (user_id, date, start_time, end_time, duration, project, task, status)
       VALUES (?, '2026-07-13', '09:00:00', '13:00:00', 4.0, 'Project Jupiter', 'Debugged database pool errors and setup sqlite schema', 'pending')`,
      [emp1.id]
    );

    await dbQuery.run(
      `INSERT INTO timesheets (user_id, date, start_time, end_time, duration, project, task, status, approved_by)
       VALUES (?, '2026-07-10', '10:00:00', '16:00:00', 6.0, 'Marketing Q3 Campaign', 'Created graphics and schedules for Facebook/LinkedIn rollout', 'approved', ?)`,
      [emp2.id, hrAdmin.id]
    );

    console.log('Timesheets seeded.');

    // 7. Seed Assets
    await dbQuery.run(
      `INSERT INTO assets (asset_name, serial_number, category, status, assigned_to, condition, location, date_added)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ['Apple MacBook Pro 16"', 'SN-MAC-778899', 'Hardware', 'assigned', emp1.id, 'Good', 'Remote', '2024-06-01']
    );

    await dbQuery.run(
      `INSERT INTO assets (asset_name, serial_number, category, status, assigned_to, condition, location, date_added)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ['Dell UltraSharp 27" Monitor', 'SN-DELL-552233', 'Hardware', 'assigned', emp1.id, 'Excellent', 'Main Office', '2024-06-02']
    );

    await dbQuery.run(
      `INSERT INTO assets (asset_name, serial_number, category, status, assigned_to, condition, location, date_added)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ['Logitech MX Master 3S Mouse', 'SN-LOGI-8899', 'Peripherals', 'available', null, 'New', 'HQ Locker 4B', '2025-01-10']
    );

    await dbQuery.run(
      `INSERT INTO assets (asset_name, serial_number, category, status, assigned_to, condition, location, date_added)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ['Focusrite Scarlett Solo Audio Interface', 'SN-FOC-4422', 'Audio', 'maintenance', null, 'Needs Cable Repair', 'IT Room', '2024-08-20']
    );

    console.log('Assets seeded.');

    // 8. Seed Expenses
    await dbQuery.run(
      `INSERT INTO expenses (user_id, title, category, amount, date, receipt_url, status, approved_by)
       VALUES (?, ?, ?, ?, ?, ?, 'approved', ?)`,
      [emp1.id, 'AWS Cloud Server Subscriptions', 'Infrastructure', 249.50, '2026-07-02', 'https://mockreceipts.s3.amazonaws.com/rec-001.png', hrAdmin.id]
    );

    await dbQuery.run(
      `INSERT INTO expenses (user_id, title, category, amount, date, receipt_url, status)
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
      [emp1.id, 'Client Dinner Meeting (Stakeholders)', 'Meals', 120.00, '2026-07-12', 'https://mockreceipts.s3.amazonaws.com/rec-002.png']
    );

    await dbQuery.run(
      `INSERT INTO expenses (user_id, title, category, amount, date, receipt_url, status, approved_by)
       VALUES (?, ?, ?, ?, ?, ?, 'rejected', ?)`,
      [emp2.id, 'Home Office Chair Purchase', 'Office Supplies', 450.00, '2026-06-15', null, hrAdmin.id]
    );

    console.log('Expenses seeded.');

    // 9. Seed Document Templates
    await dbQuery.run(
      `INSERT INTO document_templates (name, subject, body_template) 
       VALUES (?, ?, ?)`
      , [
        'Employment Verification Letter',
        'Verification of Employment for {{NAME}}',
        'To Whom It May Concern,\n\nThis letter is to verify that {{NAME}} has been employed with CEGSPortal since {{JOINING_DATE}}. Their current role is {{DESIGNATION}} and their employee ID is {{EMPLOYEE_ID}}.\n\nShould you require any further information, please contact our Human Resources department.\n\nBest Regards,\nHR Team,\nCEGSPortal'
      ]
    );

    await dbQuery.run(
      `INSERT INTO document_templates (name, subject, body_template) 
       VALUES (?, ?, ?)`
      , [
        'Experience Certificate',
        'Experience Letter for {{NAME}}',
        'Certificate of Experience\n\nThis is to certify that {{NAME}} worked as a {{DESIGNATION}} from {{JOINING_DATE}} to the present. During their tenure, they demonstrated exceptional skill and dedication in developing software systems. We wish them the absolute best in their future endeavors.\n\nSincerely,\nHR Manager,\nCEGSPortal'
      ]
    );

    // Seed generated documents
    await dbQuery.run(
      `INSERT INTO documents (user_id, title, document_type, template_name, file_path, status, created_at)
       VALUES (?, ?, ?, ?, ?, 'completed', ?)`
      , [emp1.id, 'Employment Verification Log', 'verification_letter', 'Employment Verification Letter', 'Generated text...', '2026-07-05']
    );

    console.log('Documents seeded.');

    // 10. Seed Onboarding Hires
    const onboarding1 = await dbQuery.run(
      `INSERT INTO onboarding_hires (user_id, position, start_date, progress_percent, status)
       VALUES (?, ?, ?, 40, 'in_progress')`,
      [emp4.id, 'Billing', '2026-07-20']
    );

    await dbQuery.run(
      `INSERT INTO onboarding_tasks (hire_id, task_name, is_completed, role_specific) VALUES 
       (?, 'Submit identity proofs & tax forms', 1, 'employee'),
       (?, 'Setup payroll, bank details, & work profile', 1, 'admin'),
       (?, 'Assign work computer & desk keys', 0, 'admin'),
       (?, 'Perform orientation & HR handbook review', 0, 'employee'),
       (?, 'First week project sync & introductions', 0, 'employee')`,
      [onboarding1.id, onboarding1.id, onboarding1.id, onboarding1.id, onboarding1.id]
    );

    console.log('Onboarding tasks seeded.');

    // 11. Seed System Broadcasts
    await dbQuery.run(
      `INSERT INTO notifications (sender_id, recipient_id, department_id, title, message, is_read, created_at)
       VALUES (?, NULL, NULL, ?, ?, 0, ?)`
      , [superAdmin.id, 'Welcome to CEGSPortal HRMS', 'The system is live. Please ensure your contact details, check-in schedules, and bank details are correctly set up.', today + 'T09:00:00Z']
    );

    await dbQuery.run(
      `INSERT INTO notifications (sender_id, recipient_id, department_id, title, message, is_read, created_at)
       VALUES (?, NULL, NULL, ?, ?, 0, ?)`
      , [hrAdmin.id, 'Q3 Policy Guidelines Update', 'The revised working hours policy has been published in system settings. All check-ins must be initiated before 09:00 AM.', today + 'T10:00:00Z']
    );

    // Direct notification
    await dbQuery.run(
      `INSERT INTO notifications (sender_id, recipient_id, department_id, title, message, is_read, created_at)
       VALUES (?, ?, NULL, ?, ?, 0, ?)`
      , [hrAdmin.id, emp1.id, 'AWS Expense Approved', 'Your expense claim for AWS cloud subscription was reviewed and approved for payout.', today + 'T11:00:00Z']
    );

    console.log('Notifications seeded.');

    // 12. Seed Roles and Permissions
    await dbQuery.run(
      `INSERT INTO roles_permissions (role_name, permissions_json) VALUES 
       ('super_admin', '{}'),
       ('admin', '{"employees":{"view":true,"create":true,"edit":true,"delete":true,"approve":true},"departments":{"view":true,"create":true,"edit":true,"delete":true},"leaves":{"view":true,"approve":true},"attendance":{"view":true,"edit":true},"payroll":{"view":true,"create":true,"edit":true,"approve":true},"timesheets":{"view":true,"approve":true},"assets":{"view":true,"create":true,"edit":true,"delete":true},"expenses":{"view":true,"approve":true},"documents":{"view":true,"create":true,"edit":true},"onboarding":{"view":true,"create":true,"edit":true},"notifications":{"view":true,"create":true}}'),
       ('employee', '{"employees":{"view":true},"departments":{"view":true},"leaves":{"view":true,"create":true},"attendance":{"view":true,"create":true},"payroll":{"view":true},"timesheets":{"view":true,"create":true},"assets":{"view":true},"expenses":{"view":true,"create":true},"documents":{"view":true,"create":true}}')`
    );

    console.log('Roles permissions seeded.');

    // 13. Seed Settings
    const defaultSettings = [
      {
        key: 'company',
        value: {
          name: 'CEGSPortal Corp',
          address: '42 Wall Street, Suite 100, New York, NY 10005',
          phone: '+1 212-555-0199',
          email: 'support@cegs.com',
          website: 'https://cegs.com',
          tax_id: 'TX-998877-A',
          logo: '/logo.png'
        }
      },
      {
        key: 'working_hours',
        value: {
          shift_start: '09:00:00',
          shift_end: '17:00:00',
          working_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
          grace_period_mins: 15
        }
      },
      {
        key: 'leave_policies',
        value: {
          casual_limit: 10,
          sick_limit: 15,
          vacation_limit: 20,
          personal_limit: 7,
          accrual_type: 'monthly',
          carry_forward: true
        }
      },
      {
        key: 'payroll',
        value: {
          pay_cycle: 'monthly',
          tax_slab_percent: 10,
          overtime_rate_hr: 25,
          provident_fund_percent: 5
        }
      },
      {
        key: 'security',
        value: {
          min_password_len: 8,
          two_factor_auth: false,
          session_timeout_mins: 120
        }
      }
    ];

    for (let s of defaultSettings) {
      await dbQuery.run(
        'INSERT INTO system_settings (key, value) VALUES (?, ?)',
        [s.key, JSON.stringify(s.value)]
      );
    }

    console.log('System settings seeded.');
    console.log('Seed operations successfully complete.');

  } catch (err) {
    console.error('Error during seeding database:', err);
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
