# CEGS OS — Client Frequently Asked Questions (32+ Q&As)
**Prepared for:** Client Presentations, Technical Diligence & Executive Q&A
**Document Version:** 1.0
**Audit Date:** November 2026

---

### Section 1: Architecture & Technology Stack

#### Q1: What technology stack powers the system?
**Answer:** CEGS OS is built using Next.js 14 (App Router) and React 18, utilizing TypeScript and modern JavaScript. The backend runs on serverless Node.js route handlers connected to a high-availability MongoDB Atlas cloud database via Mongoose ODM.

#### Q2: Is the system a monolithic app or microservices?
**Answer:** It follows a **Modular Serverless Monolith** architecture. Frontend and backend reside in a single codebase with clean architectural boundaries, deployed as decoupled serverless functions on Vercel. This provides the speed of single-repo development with the elastic scalability of serverless micro-endpoints.

#### Q3: Does the system use any third-party UI component libraries like Tailwind or Material UI?
**Answer:** No. CEGS OS uses a clean, proprietary vanilla CSS design system with custom CSS variables and Lucide SVG icons. This eliminates heavy external CSS runtime overhead and ensures total control over styling, branding, and layout responsiveness.

#### Q4: How are updates and new features deployed?
**Answer:** Through automated CI/CD integrated with GitHub and Vercel. When verified code is merged into the production branch, Vercel automatically runs `npm run build`, executes type checks, prerenders pages, and deploys with zero downtime.

---

### Section 2: Hosting, Infrastructure & Cloud

#### Q5: Where is the application currently hosted?
**Answer:** The application is hosted on **Vercel** with global edge CDN distribution (`https://hrms-cegs.vercel.app`). The database is hosted on **MongoDB Atlas** with automated clustering and daily backups.

#### Q6: Can CEGS OS be migrated to an on-premise server or a private cloud like AWS / Hostinger?
**Answer:** Yes. Because all dependencies are 100% pure JavaScript with zero proprietary serverless bindings, the application can be packaged into a standalone Node.js server (`output: 'standalone'`) and deployed to an AWS EC2 instance, Hostinger KVM VPS, or an on-premise Ubuntu server running PM2 and Nginx.

#### Q7: What are the hardware and server requirements for hosting?
**Answer:** For a dedicated VPS or container, a machine with 2 vCPUs and 2 GB to 4 GB of RAM running Node.js 18+ or 20+ is sufficient to support 50–100 active staff members comfortably.

#### Q8: What is the application uptime guarantee?
**Answer:** Vercel guarantees a 99.99% infrastructure uptime SLA. MongoDB Atlas provides automated multi-zone replication with 99.995% availability.

---

### Section 3: Data Security & Employee Privacy

#### Q9: How are employee passwords stored?
**Answer:** Passwords are never stored in plaintext. They are salted and hashed using **bcrypt** with 10 salt rounds (`bcryptjs`). Even database administrators cannot reverse or view employee passwords.

#### Q10: How are user sessions secured?
**Answer:** Sessions use stateless **JSON Web Tokens (JWT)** with a 24-hour expiration. Each token is cryptographically signed using an encrypted server-side `JWT_SECRET`. Expired tokens are rejected automatically by backend route handlers.

#### Q11: Can an employee view another employee's salary or payslip?
**Answer:** Absolutely not. While the UI hides unauthorized sections, the backend independently enforces authorization: requests to `/api/payroll` and `/api/leaves` from ordinary employees are strictly scoped by the server to `user_id: authUser.id`.

#### Q12: Is employee location tracked continuously during the day?
**Answer:** No. CEGS OS respects employee privacy and does not perform continuous GPS battery-draining tracking. GPS coordinates are requested **only at the exact moment of clocking in for Work-From-Office (WFO)** to verify physical presence within the 100-meter office perimeter.

---

### Section 4: Attendance & Working Hours Management

#### Q13: How does the Work From Office (WFO) geofencing work?
**Answer:** When an employee selects WFO, their browser captures latitude and longitude via the device's HTML5 Geolocation API and submits it to `/api/auth/verify-location`. The backend uses the mathematical Haversine formula to compute distance from the configured office coordinates. If within 100 meters, a signed 5-minute location token is issued.

#### Q14: Can employees fake their location with mock GPS apps?
**Answer:** The system uses short-lived (5-minute) cryptographically signed location tokens linked to the user's specific punch session. A location token generated on one device cannot be reused after expiration or manipulated in transit.

#### Q15: What happens if an employee arrives late?
**Answer:** The standard login time is 10:00 AM with a 15-minute grace period (up to 10:15 AM). Employees punching in after 10:15 AM automatically receive an attendance warning (`late_clock_in`). Specific staff members with approved adjusted schedules (e.g., 11:00 AM) have individual overrides configured in the policy engine.

#### Q16: How do attendance penalties work on monthly payroll?
**Answer:** The policy follows a **2 Free Warnings** rule per category per month. The 1st and 2nd warnings carry no monetary penalty. Starting from the 3rd warning onward, each infraction automatically triggers a **0.5-day salary deduction** on the employee's monthly payslip.

#### Q17: What happens if an employee forgets to clock in entirely?
**Answer:** An automated cloud cron job executes every evening at 7:00 PM IST (Monday through Saturday). It sweeps all active employees; anyone without an approved leave or clock-in record is automatically marked as **Absent**, resulting in a **1.0-day salary deduction**.

#### Q18: How are lunch breaks monitored?
**Answer:** Employees have a 30-minute lunch window (3:00 PM – 3:30 PM), while HR Managers have 60 minutes (3:00 PM – 4:00 PM). Returning after the designated window logs a `late_lunch_return` warning, which counts toward monthly deductions.

---

### Section 5: Leave Management & Time-Off

#### Q19: What is the leave entitlement policy?
**Answer:** Employees receive **24 paid leave days per calendar year** (12 Casual Leaves + 12 Sick Leaves), accrued at the rate of **2 paid days per month of service**.

#### Q20: What happens if an employee applies for leave beyond their accrued balance?
**Answer:** The policy calculation engine (`src/lib/leave-policy.js`) automatically splits the requested dates: days within the available balance are marked as `paid`, while excess days are flagged as `unpaid` (Loss of Pay / LOP).

#### Q21: Can a manager or HR admin reject a leave request?
**Answer:** Yes. HR Admins and Super Admins have full authority to approve or reject pending leave requests with optional reviewer notes. The employee receives an instant system notification reflecting the outcome.

---

### Section 6: Payroll Processing & Compliance

#### Q22: Who has permission to run payroll?
**Answer:** Global monthly payroll execution is **exclusively restricted to the Super Admin role**. HR Admins and regular employees can only view their own personal payslips.

#### Q23: How are salary deductions calculated during a payroll run?
**Answer:** The payroll engine queries the employee's contractual base salary and allowances, then queries all active `AttendanceWarning` records for the billing month. It subtracts 2 free warnings, computes 0.5-day cuts for remaining warnings, adds full-day cuts for unapproved absences, and outputs the exact net salary.

#### Q24: Can employees download or print their payslips?
**Answer:** Yes. The payslip view generates an official, print-formatted compensation slip showing employee ID, designation, basic pay, allowances, itemized warning deductions, and final net disbursement. It can be printed or saved as PDF via `window.print()`.

---

### Section 7: Recruitment Operations & Client Billing

#### Q25: How does the recruitment pipeline connect to client invoicing?
**Answer:** Candidates placed by recruiters are tracked in an 8-week joiner retention sheet. Once a placed candidate crosses the 60-day milestone and remains active, the system automatically tags them as `Ready to Invoice`. Finance can then raise a batch bill directly from those candidates.

#### Q26: What are the 4 stages of the billing pipeline?
**Answer:**
1. **Weekly Update (A):** Sourcing and 8-week candidate follow-up.
2. **Bill Raised (B):** Grouped placement bills issued with basic revenue (`bi`) and net margin (`ai`).
3. **Payments & Invoices (C):** Formal client tax invoice issued with GSTIN, 18% GST, and 10% TDS.
4. **Bill Cleared (D):** Bank-settled invoices marked paid with zero outstanding balance.

#### Q27: How are PDF client invoices generated?
**Answer:** Invoices are rendered dynamically in memory using **PDFKit** according to official Form GST INV-1 standards. They include itemized candidate placement tables, SAC codes (`99851`), SGST/CGST calculations, authorized digital signature stamps, and HDFC Bank direct wire transfer remittance details.

#### Q28: Can invoices be emailed directly to clients?
**Answer:** Yes. The system integrates with **Nodemailer** to dispatch official invoice PDFs directly to corporate client email addresses via SMTP (port 465 SSL or port 587 TLS).

---

### Section 8: Communication & Daily Tools

#### Q29: Is internal chat real-time?
**Answer:** Yes. The corporate messenger provides seamless peer-to-peer and group messaging with image sharing and desktop audio notifications. It currently utilizes a high-frequency 3-second client polling engine that guarantees message delivery across all devices.

#### Q30: How does the IT Helpdesk work?
**Answer:** Employees can raise hardware or workplace support tickets. IT personnel can view, prioritize, assign, and resolve tickets through their dedicated IT Task Board.

---

### Section 9: Customization, Backup & Maintenance

#### Q31: How are database backups handled?
**Answer:** MongoDB Atlas automatically performs continuous point-in-time snapshots and daily automated backups with multi-region retention. Data can be restored to any specific minute within the retention window.

#### Q32: Can company hours, office locations, and grace periods be customized without touching code?
**Answer:** Yes. The Super Admin **System Settings** page (`/settings`) allows administrators to update company branding, working start hours, grace periods, and office GPS coordinates directly from the user interface.

