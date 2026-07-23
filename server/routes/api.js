const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { dbQuery } = require('../db');
const { authenticateToken, requireRole, checkPermission } = require('../middleware/auth');

// ==========================================
// 1. DEPARTMENTS
// ==========================================

// GET /api/departments - List all departments (all roles can view, but details might differ)
router.get('/departments', authenticateToken, async (req, res) => {
  try {
    const departments = await dbQuery.all(`
      SELECT d.*, u.name as manager_name, 
             (SELECT COUNT(*) FROM users WHERE department_id = d.id AND status = 'active') as employee_count
      FROM departments d
      LEFT JOIN users u ON d.manager_id = u.id
    `);
    res.json(departments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
});

// POST /api/departments - Create department
router.post('/departments', authenticateToken, requireRole(['admin', 'super_admin']), async (req, res) => {
  const { name, code, manager_id, budget } = req.body;
  if (!name || !code) {
    return res.status(400).json({ error: 'Name and code are required' });
  }
  try {
    const result = await dbQuery.run(
      'INSERT INTO departments (name, code, manager_id, budget) VALUES (?, ?, ?, ?)',
      [name, code, manager_id || null, budget || 0]
    );
    res.status(201).json({ id: result.id, name, code, manager_id, budget });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Department code or name already exists' });
  }
});

// PUT /api/departments/:id - Update department
router.put('/departments/:id', authenticateToken, requireRole(['admin', 'super_admin']), async (req, res) => {
  const { name, code, manager_id, budget } = req.body;
  try {
    await dbQuery.run(
      'UPDATE departments SET name = ?, code = ?, manager_id = ?, budget = ? WHERE id = ?',
      [name, code, manager_id || null, budget || 0, req.params.id]
    );
    res.json({ message: 'Department updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update department' });
  }
});

// DELETE /api/departments/:id - Delete department
router.delete('/departments/:id', authenticateToken, requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    await dbQuery.run('DELETE FROM departments WHERE id = ?', [req.params.id]);
    res.json({ message: 'Department deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete department' });
  }
});


// ==========================================
// 2. EMPLOYEE MANAGEMENT
// ==========================================

// GET /api/employees - Get directory of employees
router.get('/employees', authenticateToken, async (req, res) => {
  try {
    // If employee, hide sensitive data like basic salary
    const isElevated = ['admin', 'super_admin'].includes(req.user.role);
    const query = isElevated
      ? `SELECT u.*, d.name as department_name, r.name as reports_to_name
         FROM users u
         LEFT JOIN departments d ON u.department_id = d.id
         LEFT JOIN users r ON u.reports_to = r.id`
      : `SELECT u.id, u.employee_id, u.name, u.email, u.role, u.department_id, u.designation, u.joining_date, u.status, u.avatar_url, d.name as department_name
         FROM users u
         LEFT JOIN departments d ON u.department_id = d.id
         WHERE u.status = 'active'`;
    
    const employees = await dbQuery.all(query);
    res.json(employees);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
});

// GET /api/employees/:id - Employee details
router.get('/employees/:id', authenticateToken, async (req, res) => {
  const { role, id } = req.user;
  const targetId = parseInt(req.params.id);

  if (role === 'employee' && id !== targetId) {
    return res.status(403).json({ error: 'Access denied' });
  }

  try {
    const employee = await dbQuery.get(
      `SELECT u.*, d.name as department_name, r.name as reports_to_name
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id
       LEFT JOIN users r ON u.reports_to = r.id
       WHERE u.id = ?`,
      [targetId]
    );

    if (!employee) return res.status(404).json({ error: 'Employee not found' });
    if (role === 'employee') delete employee.password_hash; // Security
    res.json(employee);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch employee details' });
  }
});

// POST /api/employees - Add employee (Admin/Super Admin only)
router.post('/employees', authenticateToken, requireRole(['admin', 'super_admin']), async (req, res) => {
  const { name, email, employee_id, role, department_id, reports_to, designation, joining_date, contact, status, basic_salary } = req.body;
  if (!name || !email || !employee_id || !role) {
    return res.status(400).json({ error: 'Name, email, employee ID and role are required' });
  }

  try {
    const passwordHash = await bcrypt.hash('Password123', 10); // Default password
    const result = await dbQuery.run(
      `INSERT INTO users (employee_id, name, email, password_hash, role, department_id, reports_to, designation, joining_date, contact, status, basic_salary, avatar_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        employee_id,
        name,
        email,
        passwordHash,
        role,
        department_id || null,
        reports_to || null,
        designation || '',
        joining_date || new Date().toISOString().split('T')[0],
        contact || '',
        status || 'active',
        basic_salary || 3000,
        `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`
      ]
    );
    res.status(201).json({ id: result.id, name, email, employee_id, role });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Employee ID or email already exists' });
  }
});

// PUT /api/employees/:id - Edit employee
router.put('/employees/:id', authenticateToken, async (req, res) => {
  const { role, id } = req.user;
  const targetId = parseInt(req.params.id);

  if (role === 'employee' && id !== targetId) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const { name, email, role: newRole, department_id, reports_to, designation, contact, status, basic_salary, password } = req.body;

  try {
    const current = await dbQuery.get('SELECT * FROM users WHERE id = ?', [targetId]);
    if (!current) return res.status(404).json({ error: 'Employee not found' });

    let passwordHash = current.password_hash;
    if (password) {
      passwordHash = await bcrypt.hash(password, 10);
    }

    // Protect administrative columns from self-updates by standard employees
    const updateRole = role === 'employee' ? current.role : (newRole || current.role);
    const updateDept = role === 'employee' ? current.department_id : department_id;
    const updateReports = role === 'employee' ? current.reports_to : reports_to;
    const updateDesignation = role === 'employee' ? current.designation : designation;
    const updateStatus = role === 'employee' ? current.status : (status || current.status);
    const updateSalary = role === 'employee' ? current.basic_salary : (basic_salary || current.basic_salary);

    await dbQuery.run(
      `UPDATE users 
       SET name = ?, email = ?, password_hash = ?, role = ?, department_id = ?, reports_to = ?, designation = ?, contact = ?, status = ?, basic_salary = ?
       WHERE id = ?`,
      [
        name || current.name,
        email || current.email,
        passwordHash,
        updateRole,
        updateDept,
        updateReports,
        updateDesignation,
        contact || current.contact,
        updateStatus,
        updateSalary,
        targetId
      ]
    );

    res.json({ message: 'Employee profile updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// DELETE /api/employees/:id - Delete/Deactivate employee (Admin/Super Admin only)
router.delete('/employees/:id', authenticateToken, requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    // We soft-deactivate instead of full purge to preserve relational integrity
    await dbQuery.run("UPDATE users SET status = 'inactive' WHERE id = ?", [req.params.id]);
    res.json({ message: 'Employee deactivated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to deactivate employee' });
  }
});


// ==========================================
// 3. LEAVE MANAGEMENT
// ==========================================

// GET /api/leaves - Get leaves list
router.get('/leaves', authenticateToken, async (req, res) => {
  const { role, id } = req.user;
  try {
    let leaves;
    if (role === 'employee') {
      leaves = await dbQuery.all(
        `SELECT l.*, u.name as employee_name, u.employee_id, u.avatar_url 
         FROM leaves l
         JOIN users u ON l.user_id = u.id
         WHERE l.user_id = ? ORDER BY l.applied_date DESC`,
        [id]
      );
    } else {
      leaves = await dbQuery.all(
        `SELECT l.*, u.name as employee_name, u.employee_id, u.avatar_url, d.name as department_name
         FROM leaves l
         JOIN users u ON l.user_id = u.id
         LEFT JOIN departments d ON u.department_id = d.id
         ORDER BY l.applied_date DESC`
      );
    }
    res.json(leaves);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch leave requests' });
  }
});

// POST /api/leaves - Apply for leave
router.post('/leaves', authenticateToken, async (req, res) => {
  const { leave_type, start_date, end_date, reason } = req.body;
  if (!leave_type || !start_date || !end_date) {
    return res.status(400).json({ error: 'Leave type, start date and end date are required' });
  }

  try {
    // Force self ID for standard employees
    const userId = req.user.id;
    const appliedDate = new Date().toISOString().split('T')[0];

    const result = await dbQuery.run(
      `INSERT INTO leaves (user_id, leave_type, start_date, end_date, reason, status, applied_date) 
       VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
      [userId, leave_type, start_date, end_date, reason || '', appliedDate]
    );

    res.status(201).json({ id: result.id, leave_type, start_date, end_date, status: 'pending' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to apply for leave' });
  }
});

// PUT /api/leaves/:id/status - Approve/Reject leave (Admin/Super Admin only)
router.put('/leaves/:id/status', authenticateToken, requireRole(['admin', 'super_admin']), async (req, res) => {
  const { status, rejection_reason } = req.body;
  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Invalid leave status' });
  }

  try {
    const leave = await dbQuery.get('SELECT * FROM leaves WHERE id = ?', [req.params.id]);
    if (!leave) return res.status(404).json({ error: 'Leave request not found' });

    await dbQuery.run(
      'UPDATE leaves SET status = ?, approved_by = ?, rejection_reason = ? WHERE id = ?',
      [status, req.user.id, rejection_reason || null, req.params.id]
    );

    // If approved, update user status to 'on_leave' if the leave covers today's date
    if (status === 'approved') {
      const todayStr = new Date().toISOString().split('T')[0];
      if (todayStr >= leave.start_date && todayStr <= leave.end_date) {
        await dbQuery.run("UPDATE users SET status = 'on_leave' WHERE id = ?", [leave.user_id]);
      }
    }

    res.json({ message: `Leave request has been ${status}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update leave status' });
  }
});


// ==========================================
// 4. ATTENDANCE MANAGEMENT
// ==========================================

// GET /api/attendance - Scoped list
router.get('/attendance', authenticateToken, async (req, res) => {
  const { role, id } = req.user;
  try {
    let records;
    if (role === 'employee') {
      records = await dbQuery.all(
        'SELECT * FROM attendance WHERE user_id = ? ORDER BY date DESC',
        [id]
      );
    } else {
      records = await dbQuery.all(
        `SELECT a.*, u.name as employee_name, u.employee_id, u.avatar_url, d.name as department_name
         FROM attendance a
         JOIN users u ON a.user_id = u.id
         LEFT JOIN departments d ON u.department_id = d.id
         ORDER BY a.date DESC`
      );
    }
    res.json(records);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch attendance records' });
  }
});

// POST /api/attendance/check-in
router.post('/attendance/check-in', authenticateToken, async (req, res) => {
  const { latitude, longitude } = req.body;
  const todayStr = new Date().toISOString().split('T')[0];
  const nowTimeStr = new Date().toTimeString().split(' ')[0]; // HH:MM:SS

  try {
    // Check if already checked in
    const existing = await dbQuery.get('SELECT * FROM attendance WHERE user_id = ? AND date = ?', [req.user.id, todayStr]);
    if (existing) {
      return res.status(400).json({ error: 'Already checked in for today' });
    }

    // Determine status (check-in after 09:00:00 is 'late')
    let status = 'present';
    const hour = new Date().getHours();
    const minute = new Date().getMinutes();
    if (hour > 9 || (hour === 9 && minute > 0)) {
      status = 'late';
    }

    const verified = (latitude && longitude) ? 1 : 0;

    await dbQuery.run(
      `INSERT INTO attendance (user_id, date, check_in_time, check_out_time, check_in_lat, check_in_lng, status, location_verified, work_hours) 
       VALUES (?, ?, ?, NULL, ?, ?, ?, ?, 0)`,
      [req.user.id, todayStr, nowTimeStr, latitude || null, longitude || null, status, verified]
    );

    res.json({ message: 'Checked in successfully', check_in_time: nowTimeStr, status });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Check-in failed' });
  }
});

// POST /api/attendance/check-out
router.post('/attendance/check-out', authenticateToken, async (req, res) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const nowTimeStr = new Date().toTimeString().split(' ')[0];

  try {
    const existing = await dbQuery.get('SELECT * FROM attendance WHERE user_id = ? AND date = ?', [req.user.id, todayStr]);
    if (!existing) {
      return res.status(400).json({ error: 'Must check in first before checking out' });
    }
    if (existing.check_out_time) {
      return res.status(400).json({ error: 'Already checked out for today' });
    }

    // Calculate hours worked
    const startStr = existing.check_in_time;
    const [sH, sM, sS] = startStr.split(':').map(Number);
    const [eH, eM, eS] = nowTimeStr.split(':').map(Number);
    
    const startTime = new Date();
    startTime.setHours(sH, sM, sS);
    const endTime = new Date();
    endTime.setHours(eH, eM, eS);

    const diffMs = endTime - startTime;
    const workHours = Math.max(0, Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100);

    await dbQuery.run(
      'UPDATE attendance SET check_out_time = ?, work_hours = ? WHERE id = ?',
      [nowTimeStr, workHours, existing.id]
    );

    res.json({ message: 'Checked out successfully', check_out_time: nowTimeStr, work_hours: workHours });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Check-out failed' });
  }
});


// ==========================================
// 5. PAYROLL MANAGEMENT
// ==========================================

// GET /api/payroll - Fetch history
router.get('/payroll', authenticateToken, async (req, res) => {
  const { role, id } = req.user;
  try {
    let slips;
    if (role === 'employee') {
      slips = await dbQuery.all(
        `SELECT p.*, u.name as employee_name, u.employee_id, u.avatar_url, u.designation, d.name as department_name
         FROM payroll p
         JOIN users u ON p.user_id = u.id
         LEFT JOIN departments d ON u.department_id = d.id
         WHERE p.user_id = ? ORDER BY p.year DESC, p.month DESC`,
        [id]
      );
    } else {
      slips = await dbQuery.all(
        `SELECT p.*, u.name as employee_name, u.employee_id, u.avatar_url, u.designation, d.name as department_name
         FROM payroll p
         JOIN users u ON p.user_id = u.id
         LEFT JOIN departments d ON u.department_id = d.id
         ORDER BY p.year DESC, p.month DESC`
      );
    }
    res.json(slips);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch payroll records' });
  }
});

// POST /api/payroll/process - Run payroll cycle (Admin/Super Admin only)
router.post('/payroll/process', authenticateToken, requireRole(['admin', 'super_admin']), async (req, res) => {
  const { month, year } = req.body;
  if (!month || !year) {
    return res.status(400).json({ error: 'Month and year are required' });
  }

  try {
    // Get all active users
    const employees = await dbQuery.all("SELECT id, basic_salary FROM users WHERE status = 'active' OR status = 'on_leave'");
    let count = 0;

    for (const emp of employees) {
      // Calculate components
      const basic = emp.basic_salary;
      const allowances = Math.round(basic * 0.15); // 15% allowance standard
      
      // Calculate dynamic overtime if they have approved timesheets in this month
      const monthStr = String(month).padStart(2, '0');
      const startPattern = `${year}-${monthStr}-%`;
      const timesheetHrs = await dbQuery.get(
        "SELECT SUM(duration) as total FROM timesheets WHERE user_id = ? AND date LIKE ? AND status = 'approved'",
        [emp.id, startPattern]
      );
      
      const otHours = Math.max(0, (timesheetHrs?.total || 0) - 160); // Anything over 160 hrs/month
      const overtime = Math.round(otHours * 25); // $25 per overtime hour
      const bonus = 0;
      const deductions = Math.round((basic + allowances + overtime) * 0.1); // 10% tax/deductions

      const netSalary = (basic + allowances + overtime + bonus) - deductions;
      const processedDate = new Date().toISOString().split('T')[0];

      try {
        await dbQuery.run(
          `INSERT INTO payroll (user_id, month, year, basic_salary, allowances, overtime, bonus, deductions, net_salary, status, processed_date)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'processed', ?)
           ON CONFLICT(user_id, month, year) DO UPDATE SET
             basic_salary=excluded.basic_salary,
             allowances=excluded.allowances,
             overtime=excluded.overtime,
             bonus=excluded.bonus,
             deductions=excluded.deductions,
             net_salary=excluded.net_salary,
             status='processed',
             processed_date=excluded.processed_date`,
          [emp.id, month, year, basic, allowances, overtime, bonus, deductions, netSalary, processedDate]
        );
        count++;
      } catch (insertErr) {
        console.error('Failed to insert payroll for user', emp.id, insertErr);
      }
    }

    res.json({ message: `Successfully processed payroll for ${count} employees.`, processed_count: count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to process payroll' });
  }
});


// ==========================================
// 6. TIMESHEETS
// ==========================================

// GET /api/timesheets
router.get('/timesheets', authenticateToken, async (req, res) => {
  const { role, id } = req.user;
  try {
    let timesheets;
    if (role === 'employee') {
      timesheets = await dbQuery.all(
        'SELECT * FROM timesheets WHERE user_id = ? ORDER BY date DESC, start_time DESC',
        [id]
      );
    } else {
      timesheets = await dbQuery.all(
        `SELECT t.*, u.name as employee_name, u.employee_id, u.avatar_url, d.name as department_name
         FROM timesheets t
         JOIN users u ON t.user_id = u.id
         LEFT JOIN departments d ON u.department_id = d.id
         ORDER BY t.date DESC, t.start_time DESC`
      );
    }
    res.json(timesheets);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch timesheets' });
  }
});

// POST /api/timesheets - Log manual hours
router.post('/timesheets', authenticateToken, async (req, res) => {
  const { date, start_time, end_time, duration, project, task } = req.body;
  if (!date || !project || !task) {
    return res.status(400).json({ error: 'Date, project, and task are required' });
  }

  try {
    let calculatedDuration = duration;
    if (start_time && end_time && !duration) {
      const [sH, sM] = start_time.split(':').map(Number);
      const [eH, eM] = end_time.split(':').map(Number);
      const diffHrs = (eH - sH) + ((eM - sM) / 60);
      calculatedDuration = Math.max(0, Math.round(diffHrs * 100) / 100);
    }

    const result = await dbQuery.run(
      `INSERT INTO timesheets (user_id, date, start_time, end_time, duration, project, task, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [req.user.id, date, start_time || null, end_time || null, calculatedDuration || 0, project, task]
    );

    res.status(201).json({ id: result.id, date, project, task, duration: calculatedDuration, status: 'pending' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to log timesheet' });
  }
});

// PUT /api/timesheets/:id/status (Admin/Super Admin only)
router.put('/timesheets/:id/status', authenticateToken, requireRole(['admin', 'super_admin']), async (req, res) => {
  const { status } = req.body;
  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  try {
    await dbQuery.run(
      'UPDATE timesheets SET status = ?, approved_by = ? WHERE id = ?',
      [status, req.user.id, req.params.id]
    );
    res.json({ message: `Timesheet entry has been ${status}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to approve/reject timesheet' });
  }
});


// ==========================================
// 7. ASSET MANAGEMENT
// ==========================================

// GET /api/assets
router.get('/assets', authenticateToken, async (req, res) => {
  const { role, id } = req.user;
  try {
    let assets;
    if (role === 'employee') {
      assets = await dbQuery.all(
        `SELECT a.*, u.name as assigned_name 
         FROM assets a
         LEFT JOIN users u ON a.assigned_to = u.id
         WHERE a.assigned_to = ?`,
        [id]
      );
    } else {
      assets = await dbQuery.all(
        `SELECT a.*, u.name as assigned_name, u.employee_id as assigned_employee_id
         FROM assets a
         LEFT JOIN users u ON a.assigned_to = u.id`
      );
    }
    res.json(assets);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch assets' });
  }
});

// POST /api/assets (Admin/Super Admin only)
router.post('/assets', authenticateToken, requireRole(['admin', 'super_admin']), async (req, res) => {
  const { asset_name, serial_number, category, status, assigned_to, condition, location } = req.body;
  if (!asset_name || !serial_number || !category) {
    return res.status(400).json({ error: 'Asset name, serial number, and category are required' });
  }

  try {
    const today = new Date().toISOString().split('T')[0];
    const result = await dbQuery.run(
      `INSERT INTO assets (asset_name, serial_number, category, status, assigned_to, condition, location, date_added)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [asset_name, serial_number, category, status || 'available', assigned_to || null, condition || 'new', location || 'main_office', today]
    );

    res.status(201).json({ id: result.id, asset_name, serial_number, category });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Serial number already exists' });
  }
});

// PUT /api/assets/:id (Admin/Super Admin only)
router.put('/assets/:id', authenticateToken, requireRole(['admin', 'super_admin']), async (req, res) => {
  const { asset_name, serial_number, category, status, assigned_to, condition, location } = req.body;
  try {
    await dbQuery.run(
      `UPDATE assets 
       SET asset_name = ?, serial_number = ?, category = ?, status = ?, assigned_to = ?, condition = ?, location = ?
       WHERE id = ?`,
      [asset_name, serial_number, category, status, assigned_to || null, condition, location, req.params.id]
    );
    res.json({ message: 'Asset updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update asset' });
  }
});

// DELETE /api/assets/:id (Admin/Super Admin only)
router.delete('/assets/:id', authenticateToken, requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    await dbQuery.run('DELETE FROM assets WHERE id = ?', [req.params.id]);
    res.json({ message: 'Asset deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete asset' });
  }
});


// ==========================================
// 8. EXPENSE MANAGEMENT
// ==========================================

// GET /api/expenses
router.get('/expenses', authenticateToken, async (req, res) => {
  const { role, id } = req.user;
  try {
    let expenses;
    if (role === 'employee') {
      expenses = await dbQuery.all(
        'SELECT * FROM expenses WHERE user_id = ? ORDER BY date DESC',
        [id]
      );
    } else {
      expenses = await dbQuery.all(
        `SELECT e.*, u.name as employee_name, u.employee_id, d.name as department_name
         FROM expenses e
         JOIN users u ON e.user_id = u.id
         LEFT JOIN departments d ON u.department_id = d.id
         ORDER BY e.date DESC`
      );
    }
    res.json(expenses);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch expenses' });
  }
});

// POST /api/expenses - Submit expense
router.post('/expenses', authenticateToken, async (req, res) => {
  const { title, category, amount, date, receipt_url } = req.body;
  if (!title || !category || !amount || !date) {
    return res.status(400).json({ error: 'Title, category, amount, and date are required' });
  }

  try {
    const result = await dbQuery.run(
      `INSERT INTO expenses (user_id, title, category, amount, date, receipt_url, status)
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
      [req.user.id, title, category, amount, date, receipt_url || null]
    );
    res.status(201).json({ id: result.id, title, category, amount, date, status: 'pending' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to submit expense' });
  }
});

// PUT /api/expenses/:id/status (Admin/Super Admin only)
router.put('/expenses/:id/status', authenticateToken, requireRole(['admin', 'super_admin']), async (req, res) => {
  const { status } = req.body;
  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  try {
    await dbQuery.run(
      'UPDATE expenses SET status = ?, approved_by = ? WHERE id = ?',
      [status, req.user.id, req.params.id]
    );
    res.json({ message: `Expense request has been ${status}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update expense status' });
  }
});


// ==========================================
// 9. DOCUMENTS & LETTERS
// ==========================================

// GET /api/documents
router.get('/documents', authenticateToken, async (req, res) => {
  const { role, id } = req.user;
  try {
    let docs;
    if (role === 'employee') {
      docs = await dbQuery.all(
        'SELECT * FROM documents WHERE user_id = ? ORDER BY created_at DESC',
        [id]
      );
    } else {
      docs = await dbQuery.all(
        `SELECT d.*, u.name as employee_name, u.employee_id 
         FROM documents d
         JOIN users u ON d.user_id = u.id
         ORDER BY d.created_at DESC`
      );
    }
    res.json(docs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// GET /api/documents/templates - Get document templates
router.get('/documents/templates', authenticateToken, async (req, res) => {
  try {
    const templates = await dbQuery.all('SELECT * FROM document_templates');
    res.json(templates);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// POST /api/documents/templates (Admin/Super Admin only)
router.post('/documents/templates', authenticateToken, requireRole(['admin', 'super_admin']), async (req, res) => {
  const { name, subject, body_template } = req.body;
  if (!name || !subject || !body_template) {
    return res.status(400).json({ error: 'Name, subject, and template body are required' });
  }

  try {
    const result = await dbQuery.run(
      'INSERT INTO document_templates (name, subject, body_template) VALUES (?, ?, ?)',
      [name, subject, body_template]
    );
    res.status(201).json({ id: result.id, name, subject });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Template name already exists' });
  }
});

// POST /api/documents/request - Employee requests a document
router.post('/documents/request', authenticateToken, async (req, res) => {
  const { title, document_type } = req.body;
  if (!title || !document_type) {
    return res.status(400).json({ error: 'Title and document type are required' });
  }

  try {
    const today = new Date().toISOString().split('T')[0];
    const result = await dbQuery.run(
      `INSERT INTO documents (user_id, title, document_type, template_name, file_path, status, created_at)
       VALUES (?, ?, ?, NULL, NULL, 'sent', ?)`,
      [req.user.id, title, document_type, today]
    );

    res.status(201).json({ id: result.id, title, status: 'sent' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to request document' });
  }
});

// POST /api/documents/generate - Admin generates letters
router.post('/documents/generate', authenticateToken, requireRole(['admin', 'super_admin']), async (req, res) => {
  const { user_id, template_id, title } = req.body;
  if (!user_id || !template_id || !title) {
    return res.status(400).json({ error: 'Employee ID, template ID, and document title are required' });
  }

  try {
    const employee = await dbQuery.get('SELECT * FROM users WHERE id = ?', [user_id]);
    const template = await dbQuery.get('SELECT * FROM document_templates WHERE id = ?', [template_id]);

    if (!employee || !template) {
      return res.status(404).json({ error: 'Employee or Template not found' });
    }

    // Replace tokens
    let text = template.body_template;
    text = text.replace(/\{\{NAME\}\}/g, employee.name);
    text = text.replace(/\{\{EMPLOYEE_ID\}\}/g, employee.employee_id);
    text = text.replace(/\{\{DESIGNATION\}\}/g, employee.designation || 'Staff');
    text = text.replace(/\{\{JOINING_DATE\}\}/g, employee.joining_date || 'N/A');
    text = text.replace(/\{\{DATE\}\}/g, new Date().toLocaleDateString());

    const today = new Date().toISOString().split('T')[0];
    // Mock save generated content to file path (we'll save the text representation)
    const result = await dbQuery.run(
      `INSERT INTO documents (user_id, title, document_type, template_name, file_path, status, created_at)
       VALUES (?, ?, ?, ?, ?, 'completed', ?)`,
      [user_id, title, 'letter', template.name, text, today]
    );

    res.status(201).json({ id: result.id, title, status: 'completed', content: text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate document' });
  }
});


// ==========================================
// 10. EMPLOYEE ONBOARDING
// ==========================================

// GET /api/onboarding
router.get('/onboarding', authenticateToken, requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const hires = await dbQuery.all(
      `SELECT oh.*, u.name as employee_name, u.employee_id, u.avatar_url, u.designation 
       FROM onboarding_hires oh
       JOIN users u ON oh.user_id = u.id`
    );

    for (let hire of hires) {
      hire.tasks = await dbQuery.all('SELECT * FROM onboarding_tasks WHERE hire_id = ?', [hire.id]);
    }

    res.json(hires);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch onboarding list' });
  }
});

// POST /api/onboarding - Initiate onboarding
router.post('/onboarding', authenticateToken, requireRole(['admin', 'super_admin']), async (req, res) => {
  const { user_id, position, start_date } = req.body;
  if (!user_id || !position || !start_date) {
    return res.status(400).json({ error: 'User ID, position, and start date are required' });
  }

  try {
    const hireResult = await dbQuery.run(
      'INSERT INTO onboarding_hires (user_id, position, start_date, progress_percent, status) VALUES (?, ?, ?, 0, "in_progress")',
      [user_id, position, start_date]
    );
    const hireId = hireResult.id;

    // Seed default tasks
    const defaultTasks = [
      { name: 'Submit identity proofs & tax forms', role: 'employee' },
      { name: 'Setup payroll, bank details, & work profile', role: 'admin' },
      { name: 'Assign work computer & desk keys', role: 'admin' },
      { name: 'Perform orientation & HR handbook review', role: 'employee' },
      { name: 'First week project sync & introductions', role: 'employee' }
    ];

    for (let task of defaultTasks) {
      await dbQuery.run(
        'INSERT INTO onboarding_tasks (hire_id, task_name, is_completed, role_specific) VALUES (?, ?, 0, ?)',
        [hireId, task.name, task.role]
      );
    }

    res.status(201).json({ id: hireId, user_id, position, status: 'in_progress' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to initialize onboarding' });
  }
});

// PUT /api/onboarding/tasks/:id - Complete/Toggle onboarding task
router.put('/onboarding/tasks/:id', authenticateToken, async (req, res) => {
  const { is_completed } = req.body; // 0 or 1
  try {
    const task = await dbQuery.get('SELECT * FROM onboarding_tasks WHERE id = ?', [req.params.id]);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    await dbQuery.run('UPDATE onboarding_tasks SET is_completed = ? WHERE id = ?', [is_completed, req.params.id]);

    // Recompute hire progress_percent
    const allTasks = await dbQuery.all('SELECT is_completed FROM onboarding_tasks WHERE hire_id = ?', [task.hire_id]);
    const completed = allTasks.filter(t => t.is_completed === 1).length;
    const progress = Math.round((completed / allTasks.length) * 100);

    const status = progress === 100 ? 'completed' : 'in_progress';
    await dbQuery.run(
      'UPDATE onboarding_hires SET progress_percent = ?, status = ? WHERE id = ?',
      [progress, status, task.hire_id]
    );

    res.json({ message: 'Task status updated', progress_percent: progress, status });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update task' });
  }
});


// ==========================================
// 11. NOTIFICATIONS
// ==========================================

// GET /api/notifications
router.get('/notifications', authenticateToken, async (req, res) => {
  const { id, department_id } = req.user;
  try {
    // Return individual, department-level, or system-wide broadcast notifications
    const notifications = await dbQuery.all(
      `SELECT * FROM notifications 
       WHERE recipient_id = ? 
          OR (recipient_id IS NULL AND department_id IS NULL)
          OR (recipient_id IS NULL AND department_id = ?)
       ORDER BY created_at DESC`,
      [id, department_id || 0]
    );
    res.json(notifications);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// POST /api/notifications/read - Mark notifications as read
router.post('/notifications/read', authenticateToken, async (req, res) => {
  const { notification_ids } = req.body;
  try {
    if (notification_ids && Array.isArray(notification_ids)) {
      // Mark specific as read
      const placeholders = notification_ids.map(() => '?').join(',');
      await dbQuery.run(
        `UPDATE notifications SET is_read = 1 WHERE id IN (${placeholders})`,
        notification_ids
      );
    } else {
      // Mark all read for this user
      await dbQuery.run(
        `UPDATE notifications SET is_read = 1 
         WHERE recipient_id = ? 
            OR (recipient_id IS NULL AND department_id IS NULL)
            OR (recipient_id IS NULL AND department_id = ?)`,
        [req.user.id, req.user.department_id || 0]
      );
    }
    res.json({ message: 'Notifications marked as read' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update notifications' });
  }
});

// DELETE /api/notifications/clear - Clear notifications
router.delete('/notifications/clear', authenticateToken, async (req, res) => {
  try {
    // For simplicity, we just mark them read or delete personal mappings. 
    // We will clear notification entries belonging directly to this user.
    await dbQuery.run('DELETE FROM notifications WHERE recipient_id = ?', [req.user.id]);
    res.json({ message: 'Notifications cleared' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to clear notifications' });
  }
});

// POST /api/notifications/broadcast - Send/Broadcast (Admin/Super Admin only)
router.post('/notifications/broadcast', authenticateToken, requireRole(['admin', 'super_admin']), async (req, res) => {
  const { title, message, recipient_id, department_id } = req.body;
  if (!title || !message) {
    return res.status(400).json({ error: 'Title and message are required' });
  }

  try {
    const today = new Date().toISOString();
    await dbQuery.run(
      `INSERT INTO notifications (sender_id, recipient_id, department_id, title, message, is_read, created_at)
       VALUES (?, ?, ?, ?, ?, 0, ?)`,
      [req.user.id, recipient_id || null, department_id || null, title, message, today]
    );

    res.status(201).json({ message: 'Notification broadcasted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to broadcast notification' });
  }
});


// ==========================================
// 12. USER MANAGEMENT & permissions (Super Admin Exclusive)
// ==========================================

// GET /api/admin/users
router.get('/admin/users', authenticateToken, requireRole(['super_admin']), async (req, res) => {
  try {
    const users = await dbQuery.all(`
      SELECT u.id, u.employee_id, u.name, u.email, u.role, u.status, u.last_login, d.name as department_name
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
    `);
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch admin users' });
  }
});

// PUT /api/admin/users/:id/role
router.put('/admin/users/:id/role', authenticateToken, requireRole(['super_admin']), async (req, res) => {
  const { role } = req.body;
  if (!['employee', 'admin', 'super_admin'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role selection' });
  }
  try {
    await dbQuery.run('UPDATE users SET role = ? WHERE id = ?', [role, req.params.id]);
    res.json({ message: 'User role updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

// PUT /api/admin/users/:id/status
router.put('/admin/users/:id/status', authenticateToken, requireRole(['super_admin']), async (req, res) => {
  const { status } = req.body;
  if (!['active', 'inactive'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  try {
    await dbQuery.run('UPDATE users SET status = ? WHERE id = ?', [status, req.params.id]);
    res.json({ message: 'User status updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

// GET /api/admin/roles-permissions
router.get('/admin/roles-permissions', authenticateToken, requireRole(['super_admin']), async (req, res) => {
  try {
    const roles = await dbQuery.all('SELECT * FROM roles_permissions');
    res.json(roles);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch roles permissions' });
  }
});

// PUT /api/admin/roles-permissions/:role
router.put('/admin/roles-permissions/:role', authenticateToken, requireRole(['super_admin']), async (req, res) => {
  const { permissions_json } = req.body;
  try {
    await dbQuery.run(
      `INSERT INTO roles_permissions (role_name, permissions_json)
       VALUES (?, ?)
       ON CONFLICT(role_name) DO UPDATE SET permissions_json = excluded.permissions_json`,
      [req.params.role, permissions_json]
    );
    res.json({ message: 'Permissions updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save roles permissions' });
  }
});


// ==========================================
// 13. SYSTEM SETTINGS
// ==========================================

// GET /api/settings
router.get('/settings', authenticateToken, async (req, res) => {
  try {
    const rows = await dbQuery.all('SELECT * FROM system_settings');
    const settings = {};
    rows.forEach(r => {
      try {
        settings[r.key] = JSON.parse(r.value);
      } catch {
        settings[r.key] = r.value;
      }
    });
    res.json(settings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch system settings' });
  }
});

// POST /api/settings (Super Admin only)
router.post('/settings', authenticateToken, requireRole(['super_admin']), async (req, res) => {
  const { settings } = req.body; // Object: { [key]: value }
  if (!settings || typeof settings !== 'object') {
    return res.status(400).json({ error: 'Invalid settings body' });
  }

  try {
    for (let [key, val] of Object.entries(settings)) {
      const valStr = JSON.stringify(val);
      await dbQuery.run(
        `INSERT INTO system_settings (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        [key, valStr]
      );
    }
    res.json({ message: 'Settings saved successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save settings' });
  }
});


// ==========================================
// 14. METRICS / ANALYTICS DATA (Admin/Super Admin only)
// ==========================================
router.get('/analytics/overview', authenticateToken, requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const totalEmployees = await dbQuery.get("SELECT COUNT(*) as count FROM users WHERE status = 'active'");
    const onLeave = await dbQuery.get("SELECT COUNT(*) as count FROM users WHERE status = 'on_leave'");
    const totalDepts = await dbQuery.get("SELECT COUNT(*) as count FROM departments");
    
    // Average attendance rate (based on this month checkins)
    const today = new Date().toISOString().split('T')[0];
    const presentToday = await dbQuery.get("SELECT COUNT(*) as count FROM attendance WHERE date = ? AND check_in_time IS NOT NULL", [today]);
    
    // Total payroll amount (processed last payroll month)
    const totalPayroll = await dbQuery.get("SELECT SUM(net_salary) as total FROM payroll WHERE status='processed'");

    // Average working hours (for completed checkins)
    const avgHrs = await dbQuery.get("SELECT AVG(work_hours) as avg_hrs FROM attendance WHERE work_hours > 0");

    // Department breakdown statistics
    const deptsBreakdown = await dbQuery.all(`
      SELECT d.name as department_name, COUNT(u.id) as employee_count, SUM(u.basic_salary) as payroll_total
      FROM departments d
      LEFT JOIN users u ON u.department_id = d.id AND u.status = 'active'
      GROUP BY d.id
    `);

    res.json({
      total_employees: totalEmployees?.count || 0,
      on_leave: onLeave?.count || 0,
      total_departments: totalDepts?.count || 0,
      present_today: presentToday?.count || 0,
      total_payroll: totalPayroll?.total || 0,
      avg_work_hours: Math.round((avgHrs?.avg_hrs || 0) * 10) / 10,
      department_breakdown: deptsBreakdown
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to compile overview analytics' });
  }
});

module.exports = router;
