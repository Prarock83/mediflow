# 🏥 MediFlow

**MediFlow** is a production-style full-stack healthcare management platform connecting **Patients**, **Doctors**, and **Administrators** in a unified, role-based ecosystem.

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Current Development Status](#-current-development-status)
- [Architecture & Tech Stack](#-architecture--tech-stack)
- [Project Structure](#-project-structure)
- [Database Foundation](#-database-foundation)
- [Local Development Setup](#-local-development-setup)
- [Planned Modules](#-planned-modules)
- [Project Roadmap](#-project-roadmap)

---

## 🌟 Overview

MediFlow streamlines healthcare operations by providing role-specific workflows for patients to discover doctors and book appointments, doctors to manage availabilities and issue digital prescriptions, and administrators to oversee audit logs and platform operations.

---

## 📊 Current Development Status

- ✅ **Backend Foundation**: Express + TypeScript server initialized with CORS, Dotenv, Nodemon, and `/api/health` verification endpoint.
- ✅ **Database Foundation**: PostgreSQL database initialized with Prisma ORM (13 domain models, 2 enums, double-booking slot constraints, initial migration applied).
- ⚙️ **Frontend Foundation**: Initialized Next.js (App Router) + TypeScript + Tailwind CSS application setup.
- ⏳ **Upcoming**: Authentication (JWT + bcrypt), API Controllers, Patient/Doctor modules, Appointment scheduling logic, and Frontend UI components.

---

## 🏗️ Architecture & Tech Stack

### Architecture
MediFlow follows a decoupled client-server architecture:
- **Frontend**: Single-Page / Server-Rendered web interface built with Next.js (App Router).
- **Backend API**: RESTful API service built with Node.js, Express, and TypeScript.
- **Database Layer**: Relational data store using PostgreSQL managed via Prisma ORM.

### Tech Stack

| Component | Technologies |
| --- | --- |
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4 |
| **Backend** | Node.js, Express.js 5, TypeScript, Nodemon, ts-node |
| **Database** | PostgreSQL 16, Prisma ORM 5 |
| **Authentication (Planned)** | JWT (JSON Web Tokens), bcrypt |

---

## 📂 Project Structure

```text
mediflow/
├── frontend/                 # Next.js App Router Frontend
│   ├── app/                  # Pages, layouts, and components
│   ├── public/               # Static assets
│   ├── package.json          # Frontend dependencies & scripts
│   └── tsconfig.json         # TypeScript configuration
├── backend/                  # Node.js + Express Backend API
│   ├── src/                  # Express application source code
│   │   └── server.ts         # Server entry point & health check
│   ├── prisma/               # Database schema & migrations
│   │   ├── schema.prisma     # Prisma data models (13 models, 2 enums)
│   │   └── migrations/       # SQL migration scripts
│   ├── dist/                 # Compiled JavaScript output
│   ├── .env.example          # Environment variables template
│   ├── package.json          # Backend dependencies & scripts
│   └── tsconfig.json         # TypeScript compiler configuration
├── .gitignore                # Root Git ignore rules
└── README.md                 # Project documentation
```

---

## 🗄️ Database Foundation

The database is built on **PostgreSQL** using **Prisma ORM** for type-safe database access and migration management.

### Key Models & Schemas
- **User & Roles**: `User` (`UserRole`: `PATIENT`, `DOCTOR`, `ADMIN`)
- **Profiles**: `Patient`, `Doctor`, `Specialization`, `DoctorAvailability`
- **Appointments & Care**: `Appointment` (`AppointmentStatus`: `PENDING`, `CONFIRMED`, `COMPLETED`, `CANCELLED`, `NO_SHOW`), `Consultation`
- **Pharmacy & Records**: `Prescription`, `PrescriptionItem`, `MedicalRecord`, `Document`
- **Platform**: `Notification`, `AuditLog`

### Double-Booking Prevention
The `Appointment` schema includes a unique constraint `@@unique([doctorId, startTime])` alongside index optimizations to enforce slot availability and prevent doctor double-booking at the database level.

---

## 🚀 Local Development Setup

### Prerequisites
- **Node.js**: v18+ or v20+
- **npm**: v9+
- **PostgreSQL**: v14+ or v16+ (running locally on port 5432)

### 1. Repository Setup
```bash
git clone https://github.com/Prarock83/mediflow.git
cd mediflow
```

### 2. Backend Setup
```bash
cd backend

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your local PostgreSQL DATABASE_URL if necessary

# Run database migrations
npx prisma migrate dev

# Start development server
npm run dev
```
The backend API will run at `http://localhost:5000` (or configured `PORT`).

Verify health endpoint:
```bash
curl http://localhost:5000/api/health
# Response: {"status":"ok","message":"MediFlow API is running"}
```

### 3. Frontend Setup
```bash
cd ../frontend

# Install dependencies
npm install

# Start development server
npm run dev
```
The frontend web application will run at `http://localhost:3000`.

---

## 🎯 Planned Modules

- 🔐 **Authentication & Authorization**: JWT-based login, password hashing with bcrypt, role-based access control (RBAC).
- 👤 **Patient Management**: Profile management, medical history viewing, prescription access.
- 👨‍⚕️ **Doctor Portal**: Availability scheduling, patient consultation management, digital prescription writing.
- 📅 **Appointment Engine**: Slot search, booking workflow, status tracking, double-booking protection.
- 💊 **Prescription & Records**: Digital prescription issuance and attachment of medical documents.
- 🛡️ **Admin Dashboard**: System audit logging, user role management, platform activity oversight.

---

## 🗺️ Project Roadmap

- [x] **Milestone 1**: Repository initialization & project structure
- [x] **Milestone 2**: Backend foundation setup (Express, TS, Nodemon, `/api/health`)
- [x] **Milestone 3**: PostgreSQL + Prisma database foundation (13 models, migrations, double-booking constraints)
- [ ] **Milestone 4**: Authentication module (JWT, bcrypt, registration, login endpoints)
- [ ] **Milestone 5**: Core API endpoints (Patients, Doctors, Availabilities, Appointments)
- [ ] **Milestone 6**: Medical records & prescription workflows
- [ ] **Milestone 7**: Admin management & Audit logging API
- [ ] **Milestone 8**: Frontend UI integration & Role-based dashboards

---

## 📜 License

This project is licensed under the ISC License.
