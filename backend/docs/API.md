# 📡 MediFlow Backend API Reference

This document details the RESTful API endpoints available in the **MediFlow** backend service.

---

## 📋 General Information

- **Base URL**: `http://localhost:5000/api` (or configured `PORT`)
- **Content Type**: `application/json`
- **CORS**: Enabled

---

## 🟢 Implemented Endpoints

### Health Check

#### `GET /api/health`

**Purpose**: Verifies that the MediFlow Express API service is online and healthy.

**Authentication**: None (Public)

**Example Request**:
```http
GET /api/health HTTP/1.1
Host: localhost:5000
Accept: application/json
```

**Example Curl**:
```bash
curl -i http://localhost:5000/api/health
```

**Example Successful Response**:
- **Status**: `200 OK`
- **Content-Type**: `application/json`

```json
{
  "status": "ok",
  "message": "MediFlow API is running"
}
```

**HTTP Status Codes**:
| Code | Description |
| --- | --- |
| `200 OK` | The API service is running normally. |
| `500 Internal Server Error` | Unhandled server error. |

---

## ⏳ Planned API Modules (Not Yet Implemented)

The following API modules are planned for development in upcoming milestones:

> [!NOTE]
> None of the endpoints listed below are currently active or implemented. They represent future module designs.

### 1. Authentication (`/api/auth`) — *Planned*
- `POST /api/auth/register` — Register a new Patient, Doctor, or Admin user.
- `POST /api/auth/login` — Authenticate user credentials and return JWT token.
- `GET /api/auth/me` — Retrieve profile info of currently logged-in user.

### 2. Patient Management (`/api/patients`) — *Planned*
- `GET /api/patients/me` — Retrieve logged-in patient profile and medical history.
- `PUT /api/patients/me` — Update patient profile information.

### 3. Doctor Management (`/api/doctors`) — *Planned*
- `GET /api/doctors` — Search and list doctors with specialization filters.
- `GET /api/doctors/:id` — Retrieve detailed doctor profile and consultation fees.
- `GET /api/doctors/:id/availability` — Retrieve available time slots for a doctor.
- `POST /api/doctors/availability` — Doctor configures weekly availability schedules.

### 4. Appointment Engine (`/api/appointments`) — *Planned*
- `POST /api/appointments` — Book an appointment slot.
- `GET /api/appointments` — List appointments for logged-in patient or doctor.
- `PATCH /api/appointments/:id/cancel` — Cancel an upcoming appointment.
- `PATCH /api/appointments/:id/status` — Doctor/Admin updates appointment status (`CONFIRMED`, `COMPLETED`, `NO_SHOW`).

### 5. Consultations & Digital Prescriptions (`/api/consultations` & `/api/prescriptions`) — *Planned*
- `POST /api/consultations` — Doctor records diagnosis and consultation notes for an appointment.
- `POST /api/prescriptions` — Doctor issues a digital prescription with medication items.
- `GET /api/prescriptions/:id` — View prescription details.

### 6. Medical Records & Documents (`/api/records`) — *Planned*
- `GET /api/records` — Retrieve patient medical records.
- `POST /api/records` — Create a medical record entry.
- `POST /api/records/:id/documents` — Upload medical attachments or lab reports.
