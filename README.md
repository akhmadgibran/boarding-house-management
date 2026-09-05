<div align="center">
  <h1>🏢 Boarding House Management System</h1>
  <p>A full-stack boarding house (kost) management system to manage rooms, tenants, payments, assets, and financial reports.</p>

  <!-- Badges -->
  <p>
    <a href="https://github.com/akhmadgibran/boarding-house-management/graphs/contributors"><img src="https://img.shields.io/github/contributors/akhmadgibran/boarding-house-management" alt="Contributors"></a>
    <a href="https://github.com/akhmadgibran/boarding-house-management/network/members"><img src="https://img.shields.io/github/forks/akhmadgibran/boarding-house-management" alt="Forks"></a>
    <a href="https://github.com/akhmadgibran/boarding-house-management/stargazers"><img src="https://img.shields.io/github/stars/akhmadgibran/boarding-house-management" alt="Stargazers"></a>
    <a href="https://github.com/akhmadgibran/boarding-house-management/issues"><img src="https://img.shields.io/github/issues/akhmadgibran/boarding-house-management" alt="Issues"></a>
    <a href="https://github.com/akhmadgibran/boarding-house-management/blob/main/LICENSE"><img src="https://img.shields.io/github/license/akhmadgibran/boarding-house-management" alt="MIT License"></a>
  </p>
</div>

<br />

## 📑 Table of Contents

- [About the Project](#about-the-project)
- [Tech Stack](#tech-stack)
- [Project Architecture](#project-architecture)
- [Getting Started](#getting-started)
    - [Prerequisites](#prerequisites)
    - [Backend Setup](#backend-setup)
    - [Frontend Setup](#frontend-setup)
- [Documentation](#documentation)
- [User Roles & Access](#user-roles--access)
- [Contributing](#contributing)
- [License](#license)

---

## 🎯 About the Project

The Boarding House Management System is an end-to-end platform designed specifically to streamline daily operations for owners (admins) and field staff (operators).

Key features include:

- **Room & Asset Management:** Track room availability and facility completeness.
- **Billing & Finance Management:** Automated billing, down-payment tracking, and monthly income/expense logging.
- **Tenant Portal:** A self-service portal for tenants to view their invoices and payment history.

---

## 💻 Tech Stack

| Layer             | Technology                                                                                                                                                    |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Frontend**      | [Next.js 16](https://nextjs.org/), [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Tailwind CSS v4](https://tailwindcss.com/) |
| **Backend**       | [Golang 1.23, Chi Router, pgx, sqlc](https://www.prisma.io/)                                 |
| **Database**      | [PostgreSQL 16](https://www.mysql.com/)                                                                                             |
| **Security/Auth** | JWT + bcrypt, Helmet, CORS                                                                                                                                    |
| **Deployment**    | GitHub Actions CI/CD → cPanel (Phusion Passenger)                                                                                                             |

---

## 🏗 Project Architecture

This project is built using a simple monorepo architecture separating the client (frontend) and server (backend).

```text
kost-project-main/
├── server-go/         # Golang REST API
│   ├── cmd/             # Application entrypoints
│   ├── db/              # SQL queries (sqlc) & migrations
│   └── internal/        # Domain-driven backend modules             # Express.js REST API
│   ├── prisma/          # Schema, migrations & SQL seeds
│   └── src/
│       ├── controllers/ # Request handlers (Business Logic)
│       ├── middlewares/ # Auth & RBAC Logic
│       ├── routes/      # Express route definitions
│       └── utils/       # DB client, services, schedulers (Cron jobs)
├── client/                          # Next.js App Router Application
│   └── src/
│       ├── app/         # Pages & layouts by route group
│       ├── components/  # Shared UI components & Layouts
│       ├── features/    # Domain-driven modules (services, types)
│       └── lib/         # Core API client, RBAC logic, utilities
├── docs/                # Comprehensive documentation
└── .github/workflows/   # CI/CD deployment pipelines
```

---

## 🚀 Getting Started

Follow the steps below to run this project in your local environment.

### Prerequisites

Ensure your environment has the following installed:

- [Node.js](https://nodejs.org/) (version ≥ 20 recommended)
- [PostgreSQL 16 server running
- NPM or Yarn

### Backend Setup

1. Navigate to the backend folder:
    ```bash
    cd server-go
    ```
2. Duplicate the environment configuration file:
    ```bash
    cp .env.example .env
    ```
3. Edit `.env` and adjust the `DATABASE_URL` credentials to match your local database.
4. Install dependencies:
    ```bash
    npm install
    ```
5. Migrate and run the seed to populate dummy data:
    ```bash
    make migrate
    make seed
    ```
6. Start the server:
    ```bash
    go run cmd/api/main.go
    ```
    _The backend will run on `http://localhost:8080`_

### Frontend Setup

1. Open a new terminal and navigate to the frontend folder:
    ```bash
    cd client
    ```
2. Duplicate the environment configuration file:
    ```bash
    cp .env.example .env.local
    ```
3. Install dependencies:
    ```bash
    npm install
    ```
4. Start the frontend application:
    ```bash
    npm run dev
    ```
    _The frontend will run on `http://localhost:3000`_

---

## 📚 Documentation

Detailed documentation can be found in the `docs/` folder:

- [API Documentation](docs/API_DOCUMENTATION.md) - Complete REST API endpoints
- [Frontend Migration Guide](docs/FRONTEND_MIGRATION_GUIDE.md) - Next.js architecture guide
- [Backend DP Requirements](docs/BACKEND_DP_REQUIREMENTS.md) - Payment system logic
- [Project Overview](docs/PROJECT_OVERVIEW.md) - Roadmap and system functions
- [Design System](docs/DESIGN.md) - UI/UX specifications
- [Project Structure](docs/PROJECT_STRUCTURE.md) - Detailed folder structure

---

## 👥 User Roles & Access

| Role         | Description             | Access Rights                                                                                |
| ------------ | ----------------------- | -------------------------------------------------------------------------------------------- |
| **Admin**    | Owner / Main Management | Full access: Manage users, delete/edit transactions, full financial reports.                 |
| **Operator** | Field Staff             | Operational access: Input tenant data, change room status, log payments, receive complaints. |
| **Penghuni** | Room Tenant             | Restricted access (Read-only bills): View personal payment history, report complaints.       |

---

## 🤝 Contributing

Contributions are always welcome! If you have suggestions to improve this system, please fork this repo and create a pull request. You can also open an issue with the "enhancement" tag.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the ISC License. See the `LICENSE` file for more information.
