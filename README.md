# CEGS HRMS — Human Resource Management System

CEGS HRMS is an enterprise-grade Human Resource Management System built with **Next.js 14**, **React 18**, **TypeScript**, and **MongoDB / Mongoose**. It provides centralized employee lifecycle management, automated attendance & timesheet tracking, payroll processing, asset allocation, expense tracking, leave management, and role-based authorization.

---

## 🚀 Features

- **Employee Lifecycle Management**: Centralized records for employee details, roles, departments, documents, and onboarding progress.
- **Attendance & Timesheets**: Clock-in/clock-out tracking, timesheet log approvals, and working hours analytics.
- **Leave Management**: Leave requests, approvals, balance tracking, and holiday calendar integration.
- **Payroll & Expenses**: Automated salary calculations, expense claims submission, reimbursement workflows, and export capabilities.
- **Asset Allocation**: Track hardware and software asset assignments across team members.
- **Role-Based Access Control (RBAC)**: Secure access permissions for Admins, Managers, and Employees with JWT authentication.
- **Data Seeding**: Built-in seed scripts for quickly populating initial demo and administrative data.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router / Pages)
- **Frontend**: React 18, Lucide React Icons, Canvas Confetti
- **Backend / Database**: Node.js, MongoDB, Mongoose, Zod
- **Authentication**: JSON Web Tokens (JWT), BcryptJS
- **Language**: TypeScript

---

## 📋 Prerequisites

- **Node.js**: `v18.x` or higher
- **npm**: `v9.x` or higher
- **MongoDB**: Connection string to a MongoDB cluster (e.g., MongoDB Atlas)

---

## ⚙️ Environment Variables Setup

Create a `.env` or `.env.local` file in the root directory and configure the following variables:

```env
MONGODB_URI=your_mongodb_connection_string
PORT=5001
JWT_SECRET=your_jwt_secret_key
TRUST_PROXY=false
ALLOW_SEED_AUTH=true
```

---

## 🚦 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Seed Initial Database (Optional)
Populate the MongoDB database with initial administrative and sample data:
```bash
npm run seed
```

### 3. Run Development Server
```bash
npm run dev
```

Open [http://localhost:5001](http://localhost:5001) (or `http://localhost:3000`) in your browser.

### 4. Build for Production
```bash
npm run build
npm run start
```

---

## 📁 Project Structure

```
cegs-hrms/
├── src/                  # Application source code (components, pages/app, API routes, models)
├── scripts/              # Database seed & utility scripts
├── public/               # Static assets & public resources
├── .env.example          # Environment variables template
├── next.config.mjs       # Next.js configuration
├── package.json          # Project dependencies & scripts
└── tsconfig.json         # TypeScript configuration
```

---

## 📝 License

Internal project for **CEGS (Center for Electronic Governance Systems)**. All rights reserved.
