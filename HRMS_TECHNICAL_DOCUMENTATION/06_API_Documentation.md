# CEGS OS — API & Backend Architecture Documentation
**Prepared for:** Career Experts Global Solutions (CEGS)
**Document Version:** 1.0
**Audit Date:** November 2026

---

## 1. API Architecture Overview

CEGS OS implements a RESTful API architecture powered by **Next.js 14 App Router Route Handlers**. All endpoints are stateless, use JSON payloads, and enforce security policies (JWT verification, role authorization, and IP validation) via helper functions.

* **Total API Endpoints Audited:** **72 routes** under `src/app/api/`.
* **Standard Response Format:**
  * Success: `HTTP 200` / `HTTP 201` with JSON object or array.
  * Validation Error: `HTTP 400` with `{ "error": "Descriptive message" }`.
  * Authentication Failure: `HTTP 401` with `{ "error": "Access token required" }`.
  * Authorization Failure: `HTTP 403` with `{ "error": "Forbidden" }`.
  * Not Found: `HTTP 404` with `{ "error": "Resource not found" }`.
  * Internal Error: `HTTP 500` with `{ "error": "Internal server error" }`.

---

## 2. API Inventory Grouped by Module

### 2.1 Authentication Endpoints (`/api/auth`)

| Endpoint | Method | Purpose | Auth Required | Roles | Body / Query | Database Operation |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/auth/login` | `POST` | Authenticate staff member & issue 24h JWT | No | Public | `{ email, password, locationToken, workMode }` | Queries `User` by email, verifies bcrypt hash |
| `/api/auth/session` | `GET` | Validate existing JWT token on page reload | Yes | All | Header: `Bearer <token>` | Queries `User` by decoded token ID |
| `/api/auth/verify-location` | `POST` | Validate user coordinates against 100m geofence | No | Public | `{ lat, lng }` | None (In-memory Haversine distance calculation) |
| `/api/auth/check-ip` | `GET` | Verify client IP against `ALLOWED_IP_RANGES` | No | Public | Reads client IP from headers | None (In-memory CIDR range check) |
| `/api/auth/forgot-password` | `POST` | Request password reset instructions | No | Public | `{ email }` | Checks `User` record |
| `/api/auth/change-first-password` | `POST` | Force password reset on temporary passwords | Yes | All | `{ newPassword }` | Updates `User.password_hash` |

---

### 2.2 Attendance & Warnings Endpoints (`/api/attendance`)

| Endpoint | Method | Purpose | Auth Required | Roles | Body / Query | Database Operation |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/attendance` | `GET` | Fetch monthly attendance records for calendar | Yes | All (Filter by self if employee) | `?month=YYYY-MM&user_id=...` | Reads `Attendance` matching date range |
| `/api/attendance/check-in` | `POST` | Clock in for the workday (WFO/WFH) | Yes | All | `{ mode, lat, lng, locationToken }` | Creates/Updates `Attendance`, creates `AttendanceWarning` if late |
| `/api/attendance/check-out` | `POST` | Clock out & compute total working hours | Yes | All | `{ check_out_time }` | Computes work hours & updates `Attendance` |
| `/api/attendance/visit-status` | `GET`, `POST` | Log and query office/field visit departures | Yes | All | `{ destination, purpose, returnTime }` | Updates `Attendance.visit_status` |
| `/api/attendance/mark-absent` | `GET`, `POST` | Daily automated cron marking absent staff | Yes | Cron Secret or Admin | Header: `x-cron-secret` | Queries `User`, creates `Attendance` with status="absent" |
| `/api/attendance-warnings` | `GET`, `POST` | Query & log attendance warnings (late, lunch) | Yes | Admin, SA | `?user_id=...&month=...` | Reads/Writes `AttendanceWarning` collection |

---

### 2.3 Administration & Employee Management (`/api/admin`, `/api/users`)

| Endpoint | Method | Purpose | Auth Required | Roles | Body / Query | Database Operation |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/admin/employees/onboard` | `POST` | Create a new employee record with credentials | Yes | Admin, SA | `{ name, email, password, role, salary, ... }` | Hashes password, creates new `User` document |
| `/api/admin/employees/[id]` | `GET`, `PUT`, `DELETE` | View, update, or soft-delete employee profile | Yes | Admin, SA | `{ name, designation, salary, status, ... }` | `User.findByIdAndUpdate` / `findByIdAndDelete` |
| `/api/admin/employees/[id]/reset-password` | `POST` | Admin password override for an employee | Yes | Super Admin | `{ newPassword }` | Hashes password, updates `User.password_hash` |
| `/api/admin/users` | `GET`, `POST` | Super Admin user accounts management | Yes | Super Admin | `?search=...&role=...` | Queries/creates system `User` records |
| `/api/admin/users/[id]/role` | `PUT` | Switch role of an account (e.g. employee -> admin) | Yes | Super Admin | `{ role }` | Updates `User.role` |
| `/api/admin/roles-permissions` | `GET`, `POST` | Manage functional permission matrix per role | Yes | Super Admin | `{ role, permissions }` | Reads/Updates `RolePermission` |

---

### 2.4 Client Invoicing & Billing (`/api/client-invoices`, `/api/clients`)

| Endpoint | Method | Purpose | Auth Required | Roles | Body / Query | Database Operation |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/client-invoices` | `GET` | List client invoices across 4 pipeline stages | Yes | Finance, SA | `?stage=...&client=...&status=...` | Queries `ClientInvoice` (auto-seeds defaults once) |
| `/api/client-invoices` | `POST` | Multi-action handler: raise, create, delete, paid | Yes | Finance, SA | `{ action: "delete_invoice" / "mark_paid", ... }` | Updates/Deletes `ClientInvoice`, updates blacklist |
| `/api/client-invoices/download-pdf` | `GET`, `POST` | Generate & stream official Form GST INV-1 PDF | Yes / Token | All Auth | `?invoiceNo=...` or `{ invoice }` | Generates in-memory binary via `pdfkit` |
| `/api/client-invoices/send-email` | `POST` | Email tax invoice PDF directly to client contact | Yes | Finance, SA | `{ invoiceNo, recipients, subject, body }` | Generates PDF buffer & dispatches via `nodemailer` |
| `/api/clients` | `GET`, `POST` | Corporate client directory & GSTIN records | Yes | Finance, Admin, SA | `{ name, gstin, address, poc }` | Reads/Writes `ClientCompany` collection |

---

### 2.5 Recruitment & Targets (`/api/candidates`, `/api/walkin-selections`, `/api/campaigns`)

| Endpoint | Method | Purpose | Auth Required | Roles | Body / Query | Database Operation |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/candidates` | `GET`, `POST` | Recruiter candidate call & interview intake | Yes | Recruiter, Admin, SA | `{ name, phone, client, status, recruiter }` | Reads/Writes `Candidate` collection |
| `/api/candidates/all` | `GET` | Bulk fetch all candidates for export | Yes | Admin, SA | None | Streams full `Candidate` collection |
| `/api/walkin-selections`| `GET`, `POST` | Log in-office walk-in candidate interviews | Yes | Recruiter, Admin, SA | `{ name, client, interviewStatus, ... }` | Reads/Writes `WalkinSelection` collection |
| `/api/campaigns/hub` | `GET` | Recruiter league table & monthly joiner targets | Yes | All | `?month=YYYY-MM` | Aggregates candidate achievement against `Campaign` |

---

### 2.6 Leave Management (`/api/leaves`)

| Endpoint | Method | Purpose | Auth Required | Roles | Body / Query | Database Operation |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/leaves` | `GET`, `POST` | Fetch leave history & submit new leave request | Yes | All | `{ type, start, end, reason }` | Queries/Creates `Leave` collection |
| `/api/leaves/[id]/status`| `PUT` | Manager / HR approval or rejection of leave | Yes | Admin, SA | `{ status: "approved" / "rejected", note }` | Updates `Leave.status`, creates `Notification` |

---

### 2.7 Payroll Processing (`/api/payroll`)

| Endpoint | Method | Purpose | Auth Required | Roles | Body / Query | Database Operation |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/payroll` | `GET` | Fetch payslip records (filtered by user if employee) | Yes | All (Full: SA) | `?month=YYYY-MM` | Queries `Payroll` collection |
| `/api/payroll/process` | `POST` | Calculate & execute monthly payroll run | Yes | **Super Admin Only** | `{ month, year }` | Aggregates `AttendanceWarning`, computes deductions, creates `Payroll` |

---

### 2.8 Chat & Notifications (`/api/messages`, `/api/chat-groups`, `/api/notifications`)

| Endpoint | Method | Purpose | Auth Required | Roles | Body / Query | Database Operation |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/messages` | `GET`, `POST` | Fetch conversation history or send direct message | Yes | All | `?groupId=...` / `{ toId, text, imageUrl }` | Queries/Inserts into `Message` collection |
| `/api/messages/read` | `POST` | Mark messages as read | Yes | All | `{ fromId, groupId }` | Updates `Message.read` flag |
| `/api/chat-groups` | `GET`, `POST` | List channels or create new group chat | Yes | All | `{ name, members, isPrivate }` | Reads/Inserts into `ChatGroup` collection |
| `/api/notifications` | `GET` | Fetch user alerts & warning notifications | Yes | All | None | Reads `Notification` where user is recipient |
| `/api/notifications/broadcast` | `POST` | Company-wide announcement notification | Yes | Admin, SA | `{ title, message, priority }` | Broadcasts `Notification` to all active users |

---

### 2.9 IT Support & Asset Tracking (`/api/it`, `/api/assets`)

| Endpoint | Method | Purpose | Auth Required | Roles | Body / Query | Database Operation |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/it/tasks` | `GET`, `POST` | List or assign daily IT operational tasks | Yes | IT Team, Admin, SA | `{ title, category, priority, assigneeId }` | Queries/Creates `ItTask` collection |
| `/api/it/tasks/[id]` | `PUT` | Update IT task status (In Progress, Resolved) | Yes | IT Team, Admin, SA | `{ status, resolutionNotes }` | Updates `ItTask` status and resolution |
| `/api/assets` | `GET`, `POST` | Hardware inventory (laptops, monitors, devices) | Yes | IT Team, Admin, SA | `{ assetTag, type, serialNo, assignedTo }` | Reads/Writes `Asset` collection |

