# CEGS OS — Portals, Roles & Modules Functional Analysis
**Prepared for:** Career Experts Global Solutions (CEGS)
**Document Version:** 1.0
**Audit Date:** November 2026

---

## 1. Role-Based Portals Overview

CEGS OS segments access into **five distinct role-based portals**. Each role receives a tailored navigation bar, distinct operational features, and specialized dashboards:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CEGS OS PORTALS ARCHITECTURE                    │
├─────────────────┬─────────────────┬──────────────────┬─────────────────┤
│   SUPER ADMIN   │    HR ADMIN     │     FINANCE      │  IT & EMPLOYEE  │
│  Full Oversight │  Daily People   │ Invoicing & P&L  │  Self-Service & │
│  & System Health│  & Recruitment  │  Client Billing  │  Task Execution │
└─────────────────┴─────────────────┴──────────────────┴─────────────────┘
```

---

## 2. Portal-by-Portal Breakdown

### 2.1 Super Admin Portal
* **Intended Users:** Company Directors, Managing Partners, Executive Leadership.
* **Home Route:** `/dashboard` (with full system control).
* **Role Identifier:** `super_admin`.
* **Core Philosophy:** *Oversight-Only*. Super Admins do not clock in for personal daily recruiter targets or routine tasks; they possess panoramic executive control over all operations.
* **Navigation Menus:**
  * **Main Dropdown:**
    * *Dashboard* (`/dashboard`): Real-time office attendance counters, company visit status, department breakdowns, headcount statistics.
    * *Users* (`/users`): Master accounts list. Create, edit, deactivate user accounts, reset passwords, and switch system roles.
    * *IT Team Task Management* (`/admin/it-tasks`): Assign, monitor, and review IT department operational tasks and tickets.
    * *Permissions* (`/billing/permissions`): Configure functional permissions matrix per role.
    * *System Settings* (`/settings`): Configure company profile, office geofence coordinates, business working hours, and grace periods.
  * **Campaign Dropdown:**
    * *Recruitment Portal* (`/campaign/recruitment`): Candidate registration, 8-week joiner tracking sheets, and walk-in selections.
    * *Recruitment Performance* (`/campaign/hub`): Team monthly joiner targets, recruiter league tables, incentive bonuses.
    * *Targets* (`/campaign/targets`): 5 sub-datasheets (Calls, Interviews, Walkins, Selected, Joined).
    * *Workflows* (`/campaign/workflows`): Campaign process management.
    * *Rewards & Recognition* (`/campaign/rewards`): Team awards, badges, and recognition feed.
    * *Internal Job Portal* (`/campaign/jobs`): Internal job vacancies and applications.
    * *Meeting Scheduler* (`/campaign/meetings`): Executive and team calendar scheduling.
  * **Billing & HR Governance Dropdown:**
    * *All Staff Payroll Records* (`/billing/payroll`): **Exclusively restricted to Super Admin**. Run monthly payroll calculations, review attendance warning deductions, approve salary payouts, generate digital pay slips.
    * *Attendance* (`/billing/attendance`): Global company attendance register, manual punch overrides, monthly visit history.
    * *Leave Management* (`/billing/leaves`): Company-wide leave applications, approval/rejection oversight.
    * *Payments & Invoices* (`/finance/invoices`): Client tax invoicing, revenue pipeline, payment settlement.
    * *Organizations* (`/billing/organizations`): Corporate entity structure.
    * *Departments* (`/billing/departments`): Department and process list (Etisalat, CNR, ICAD, Flipkart, etc.).
    * *Policies* (`/billing/policies`): Official company HR documentation.
    * *Integrations* (`/billing/integrations`): Third-party software connectors.
    * *Audit Logs* (`/billing/audit-logs`): Security and access audit trails.
    * *Security* (`/billing/security`): IP whitelist and network access controls.

---

### 2.2 HR Admin Portal
* **Intended Users:** HR Managers, Operations Leads (e.g., Madiha Mehak, Nusrath Hussain).
* **Home Route:** `/employees`.
* **Role Identifier:** `admin`.
* **Key Capabilities:**
  * *Employee Directory & Onboarding* (`/employees`): Add new staff members with initial salary, designation, emergency contacts, login schedule, and bank information.
  * *Attendance Monitoring* (`/billing/attendance`): Track real-time employee clock-ins, late warnings, lunch break overruns, and out-of-office client visits.
  * *Leave Administration* (`/billing/leaves`): Review incoming leave requests, view leave balances (24 annual days accrued at 2/month), and approve/reject applications.
  * *Recruitment Pipeline Management* (`/campaign/recruitment`): Add candidate records, monitor 8-week follow-up status, update hiring statuses.
  * *Compliance & Documents* (`/billing/documents`): Issue employment contracts, offer letters, warning letters, and NDA documents.
  * *Salary View* (`/billing/payroll`): **Restricted to personal salary only** (`My Salary & Payslips`). HR Admins cannot execute global payroll runs.

---

### 2.3 Finance Portal
* **Intended Users:** Finance Officers, Accounts Executives.
* **Home Route:** `/finance/invoices`.
* **Role Identifier:** `finance`.
* **Key Capabilities:**
  * *4-Stage Client Billing Pipeline* (`/finance/invoices`):
    1. **Weekly Update (Section 1A):** Billing readiness tracker for placed candidates passing the 60-day threshold.
    2. **Bill Raised (Section 2B):** Invoices issued and outstanding tax register.
    3. **Payments & Invoices (Section 3C):** Client billing milestones, GST computation (18%), TDS deductions (10%), and invoice issuance.
    4. **Bill Cleared (Section 4D):** Bank-settled invoices, payment confirmation records.
  * *Official Form GST INV-1 Generation:* In-memory rendering of downloadable PDF invoices with HDFC Bank remittance details, digital signature stamps, and itemized candidate placement line items.
  * *Client Email Invoicing:* Dispatching PDF invoices directly to corporate client contacts via SMTP.
  * *Personal Payroll* (`/billing/payroll`): View personal payslips.

---

### 2.4 IT Team Portal
* **Intended Users:** IT Support Engineers, Systems Administrators.
* **Home Route:** `/dashboard`.
* **Role Identifier:** `it_team`.
* **Key Capabilities:**
  * *IT Task Management* (`/it/tasks`): Track daily IT operational assignments (hardware maintenance, network configuration, workstation setups, software installs).
  * *Helpdesk Ticketing* (`/it/support`): Receive and resolve internal employee IT support tickets.
  * *Asset Management* (`/billing/assets`): Log company laptops, monitors, accessories, and assign them to specific employees.
  * *Self-Service Attendance & Leave:* Standard personal check-in/out and leave requests.

---

### 2.5 Employee Portal
* **Intended Users:** Recruiters, Sourcing Specialists, Operations Executives.
* **Home Route:** `/dashboard`.
* **Role Identifier:** `employee`.
* **Key Capabilities:**
  * *Personal Attendance:* Clock in (with GPS geofence validation for WFO or standard WFH), track break times, log lunch returns, and request office visits.
  * *Recruiter Targets & Datasheets* (`/campaign/targets`): Log daily calls made, interviews scheduled, walk-ins attended, and candidate selections.
  * *Leave Applications* (`/billing/leaves`): Submit personal sick and casual leave requests, track remaining annual balance.
  * *Payslips* (`/billing/payroll`): Download and print monthly payslips showing basic salary, allowances, and warning-related deductions.
  * *Internal Messenger:* Peer-to-peer direct chat and group communication with colleagues.
  * *Helpdesk:* Raise tickets to IT support for equipment or software issues.

---

## 3. Comprehensive Module Inventory Matrix

| Module Name | Route | Allowed Roles | Data Visibility | Primary DB Collection | Implementation Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Authentication** | `/login` | Public | Login credentials, WFO/WFH | `User` | **Fully Implemented** |
| **Dashboard** | `/dashboard` | All | Role-tailored metrics & quick actions | `User`, `Attendance`, `ItTask` | **Fully Implemented** |
| **Attendance Tracker** | Top Header / Modal | All | Personal daily punches, live timer | `Attendance`, `AttendanceWarning` | **Fully Implemented** |
| **Office Visits Monitor** | Header Modal | All | Monthly client/field visit history | `Attendance` | **Fully Implemented** |
| **Employee Directory** | `/employees`, `/directory` | Admin, SA, All | Staff records, contacts, profiles | `User`, `Department` | **Fully Implemented** |
| **User Management** | `/users` | Super Admin | System accounts, roles, statuses | `User` | **Fully Implemented** |
| **Leave Management** | `/billing/leaves` | All (Approval: Admin, SA) | Personal vs Company-wide | `Leave`, `User` | **Fully Implemented** |
| **Payroll & Payslips** | `/billing/payroll` | All (Run: Super Admin only) | All staff (SA) / Personal (Emp) | `Payroll`, `AttendanceWarning` | **Fully Implemented** |
| **Client Invoices** | `/finance/invoices` | Finance, Super Admin | Client billing, GST, receipts | `ClientInvoice`, `JoinerEntry` | **Fully Implemented** |
| **Recruitment Portal** | `/campaign/recruitment` | Recruiter, Admin, SA | Candidate pipeline & 8-week follow-up| `Candidate`, `JoinerEntry` | **Fully Implemented** |
| **Recruitment Targets** | `/campaign/targets/*` | Recruiter, Admin, SA | Calls, interviews, walkins, joined | `Candidate`, `WalkinSelection` | **Fully Implemented** |
| **Campaign Hub** | `/campaign/hub` | Recruiter, Admin, SA | Monthly scores, bonuses, milestones | `Campaign`, `CampaignAward` | **Fully Implemented** |
| **IT Tasks Management** | `/admin/it-tasks`, `/it/tasks` | IT Team, Admin, SA | IT tickets, statuses, assignments | `ItTask`, `User` | **Fully Implemented** |
| **IT Support Helpdesk** | `/it/support`, `/helpdesk` | All | Support tickets & resolutions | `ItTask`, `Asset` | **Fully Implemented** |
| **Asset Tracking** | `/billing/assets` | IT Team, Admin, SA | Hardware inventory & serial numbers | `Asset`, `User` | **Fully Implemented** |
| **Messenger & Chat** | Floating Modal | All | Direct messages & group discussions | `Message`, `ChatGroup` | **Fully Implemented** |
| **Notifications** | `/notifications` | All | Broadcasts, alerts, warnings | `Notification` | **Fully Implemented** |
| **Roles & Permissions** | `/billing/permissions` | Super Admin, HR Admin | Functional permission matrix | `RolePermission`, `PermissionLog` | **Fully Implemented** |
| **System Settings** | `/settings` | Super Admin | Office geofence, grace period, hours| `SystemSetting` | **Fully Implemented** |
| **Documents Hub** | `/billing/documents` | Admin, Super Admin | HR letters, templates, requests | `Document`, `DocumentTemplate`| **Fully Implemented** |
| **Timesheets** | `/campaign/timesheets`| All | Weekly timesheet hour submissions | `Timesheet`, `User` | **Fully Implemented** |
| **Announcements** | `/announcements` | All | Company notices & updates | LocalStore / Fast Cache | **Partially Implemented** |
| **Rewards & Recognition**| `/campaign/rewards` | All | Peer nominations & badges | `CampaignAward` | **Partially Implemented** |
| **Internal Jobs** | `/campaign/jobs` | All | Internal vacancy postings | LocalStore / Fast Cache | **Partially Implemented** |
| **Meeting Scheduler** | `/campaign/meetings` | All | Meeting slot requests | LocalStore / Fast Cache | **Partially Implemented** |
| **Org Chart** | `/admin/orgchart` | Super Admin, Admin | Visual hierarchy tree | `User`, `Department` | **Frontend / LocalStore** |
| **Backups & Query Term**| `/admin/*` | Super Admin | Infrastructure monitoring & query tool| LocalStore / Mock | **UI / Mock Only** |

