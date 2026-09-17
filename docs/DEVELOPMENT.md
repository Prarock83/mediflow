# 🛠️ MediFlow Development Environment Guide

This guide details how to set up, configure, and run the **MediFlow** full-stack healthcare platform locally.

---

## 📋 Prerequisites & Tools

Ensure you have the following installed on your local workstation:

- **Node.js**: v18.x, v20.x, or v22.x (Recommended: v20+ LTS)
- **npm**: v9+ or v10+
- **PostgreSQL**: v14+ or v16+ (running locally on port `5432`)
- **Git**: v2+

---

## ⚙️ Environment Variables

### Backend Configuration

The backend reads configuration settings from `backend/.env`.

> [!CAUTION]
> Never commit `.env` files, actual passwords, or database credentials to Git. Use placeholders in documentation and `.env.example`.

#### `backend/.env.example`
```env
PORT=5000
DATABASE_URL="postgresql://<db_user>:<db_password>@localhost:5432/<db_name>?schema=public"
```

To configure your local environment:
```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` with your local PostgreSQL user and database name:
```env
PORT=5000
DATABASE_URL="postgresql://<your_local_user>:<your_local_password>@localhost:5432/mediflow_db?schema=public"
```

---

## 🗄️ PostgreSQL & Prisma Database Setup

### 1. Ensure PostgreSQL is Running
Verify that PostgreSQL is running locally on port `5432`:
```bash
# Example check on macOS
pg_isready -h localhost -p 5432
```

### 2. Create Local Database
Create the local PostgreSQL database (e.g. `mediflow_db`):
```bash
createdb mediflow_db
```

### 3. Prisma Commands Used by the Project

Run all Prisma commands from the `backend/` directory:

- **Format Prisma Schema**:
  ```bash
  cd backend
  npx prisma format
  ```

- **Validate Prisma Schema**:
  ```bash
  npx prisma validate
  ```

- **Create & Apply Database Migrations**:
  ```bash
  npx prisma migrate dev --name <migration_name>
  ```
  *(Example initial migration: `npx prisma migrate dev --name init`)*

- **Generate Prisma Client**:
  ```bash
  npx prisma generate
  ```

---

## 🚀 Running the Backend API

### 1. Install Backend Dependencies
```bash
cd backend
npm install
```

### 2. Run Backend in Development Mode
Starts the server with `nodemon` and `ts-node` for live reload:
```bash
npm run dev
```
The server will start and log:
```text
MediFlow API running on port 5000
```

### 3. Run TypeScript Build Check
To verify that the TypeScript code compiles cleanly:
```bash
npm run build
```
This compiles TypeScript files from `src/` to JavaScript files in `dist/`.

### 4. Run Production Server (Built Output)
```bash
npm run start
```

### 5. Check Health Endpoint
Verify that the Express server is online by sending a `GET` request:
```bash
curl -i http://localhost:5000/api/health
```

Expected Response (`200 OK`):
```json
{
  "status": "ok",
  "message": "MediFlow API is running"
}
```

---

## 💻 Running the Frontend Application

### 1. Install Frontend Dependencies
```bash
cd frontend
npm install
```

### 2. Run Frontend in Development Mode
Starts the Next.js development server:
```bash
npm run dev
```
The application will be accessible at `http://localhost:3000`.

### 3. Build Frontend for Production
```bash
npm run build
```

### 4. Start Production Frontend Server
```bash
npm run start
```

### 5. Run Linter
```bash
npm run lint
```

---

## 📁 Repository Overview Quick Reference

| Action | Path | Command |
| --- | --- | --- |
| Run Backend Dev Server | `backend/` | `npm run dev` |
| Build Backend TS | `backend/` | `npm run build` |
| Apply Prisma Migrations | `backend/` | `npx prisma migrate dev` |
| Run Frontend Dev Server | `frontend/` | `npm run dev` |
| Build Frontend | `frontend/` | `npm run build` |
