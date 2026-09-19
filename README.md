# Performance Management System (PMS)

A comprehensive, role-based Performance Management web application built with Node.js, Express, MongoDB, React, and Vite.

---

## 🌟 Key Features

- **Role-Based Access Control (RBAC)**:
  - **Admin (role_id 1)**: Full visibility of all reviews across all departments, department filter, full CRUD capability.
  - **Manager / Team Leader (role_id 2 / 3)**: Manages and creates reviews exclusively for direct reportees in their reporting chain.
  - **Employee (role_id 4)**: Read-only access restricted strictly to their own performance reviews.
- **Dynamic Performance Analytics**:
  - Period-Wise Breakdown (Monthly, Quarterly, Annual).
  - Rating Distribution Bucket Breakdown (1–5, 6–8, 9+).
- **Filtering & Search**:
  - Filter by visible employee, department (Admin only), review period, and rating bucket.
  - Date range filters (Start Date From / To) and debounced search.
- **Review Management**:
  - Create, update, and delete reviews with real-time score indicators (1–10).
  - Interactive "View Comments" modal.
- **Quick-Access Credentials**:
  - One-click sign-in buttons on the login screen for testing all system roles.

---

## 🏗️ Architecture & Tech Stack

- **Backend**: Node.js & Express (`server/`)
  - **Database**: MongoDB Atlas (`employee_management` database)
  - **Authentication**: JWT with 1-day expiration and active status enforcement
  - **Counter System**: Atomic sequence generator (`Counter` model) for unique integer `review_id` and `employee_id`
  - **DNS Fix**: Automatic fallback DNS resolvers (`8.8.8.8`, `1.1.1.1`) to ensure reliable Atlas connectivity
- **Frontend**: React 19 & Vite (`client/`)
  - **Routing**: React Router DOM v7
  - **Icons**: Lucide React
  - **Design System**: Vanilla CSS design tokens, modern dark-slate aesthetic, fluid responsive layout

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js (v18+)
- npm

### 1. Server Setup

```bash
cd server
npm install
npm start
# Server will run on http://localhost:5002
```

To run the automated backend test suite:
```bash
npm run test:api
```

### 2. Client Setup

```bash
cd client
npm install
npm run dev
# Vite dev server will run on http://localhost:5173
```

---

## 🔑 Demo Credentials

| Role | Username | Password | Scope & Permissions |
| :--- | :--- | :--- | :--- |
| **Admin** | `superadmin` | `Admin@123` | Full access across all departments & employees |
| **Manager** | `admin` | `shreyas` | Reviews direct reportees (Accounts & Sales) |
| **Team Leader** | `kal` | `kal` | Reviews direct reportees (Operations) |
| **Employee** | `shr` | `shr` | Read-only view of own reviews |

---

## 📡 API Reference

- `POST /api/auth/login`: Authenticate and issue JWT token
- `GET /api/auth/me`: Get current authenticated user details
- `GET /api/employees/reportees`: Retrieve reportees filtered by user role scope
- `GET /api/departments`: Active departments list (Admin only)
- `GET /api/reviews`: List reviews with pagination, search, and filters
- `GET /api/reviews/stats`: Aggregated period-wise and rating bucket counts
- `GET /api/reviews/:id`: Retrieve single review details
- `POST /api/reviews`: Create a new performance review
- `PUT /api/reviews/:id`: Update an existing review
- `DELETE /api/reviews/:id`: Delete a review
