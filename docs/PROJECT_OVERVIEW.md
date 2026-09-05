# Project Overview & Roadmap

This document provides a high-level overview of the Boarding House Management System platform's goals, core functionalities, and development roadmap.

---

## 🎯 Platform Goals & Architectural Concept

To build an integrated boarding house (kost) information system to assist owners/operators and tenants in managing administration, payments, and reporting efficiently.

### Core Architecture
1. **Frontend**: Next.js (App Router) - Responsive design for desktop, tablet, and mobile.
2. **Backend**: Golang (Chi Router, pgx, sqlc) - Centralized REST API.
3. **Database**: PostgreSQL - Relational storage for rooms, assets, users, and financial data.

---

## 🚀 Development Roadmap (MVP)

| Feature | Admin Status | Operator Status | Tenant Status |
|---|:---:|:---:|:---:|
| **User Management** | ✅ | ❌ | ❌ |
| **Room Management** | ✅ | ✅ | ❌ |
| **Payment Input** | ✅ | ✅ | ❌ |
| **Financial Reports** | ✅ | ⚠️ *(Limited)* | ❌ |
| **Asset Management** | ✅ | ✅ | ❌ |
| **Payment History** | ✅ | ✅ | ✅ |
| **View Invoices** | ✅ | ✅ | ✅ |
| **Notifications** | ✅ | ✅ | ✅ |

---

## 👥 User Roles & Functionalities

The system is divided into 3 main actors:

### 1. Admin (Owner / Main Management)
The actor with full control over kost operations and data.
- Manage user data (admins, operators, tenants).
- Manage room data & pricing.
- Monitor financial reports (income & expenses).
- Monitor all kost assets.
- Configure policies (due dates, etc.).
- Input operational expenses (maintenance, electricity, water, etc.).

### 2. Operator (Field Staff / Admin)
The operational actor managing daily activities.
- Input payments received from tenants.
- Manage tenant data (check-in, check-out).
- Manage room data (status: vacant / occupied).
- Input daily operational expenses (maintenance, electricity, water, etc.).
- Update asset statuses (broken, under repair, etc.).

### 3. Tenant (Room Renter)
The customer or room renter.
- View current month's invoice and payment history.
- View payment status (paid / unpaid).
- Receive payment due date notifications.
- View detailed room information and facilities.
- *(Optional)* Submit complaints / repair requests for assets.
- *(Optional)* Provide a rating upon check-out.

---

## ⚙️ System Functionalities by Module

### A. Financial Management Module
- Log kost payments (monthly / annually).
- Log operational expenses (Electricity, water, maintenance, asset purchases).
- Generate reports: Income Report, Expense Report, Profit/Loss Report.

### B. Room Management Module
- Room inventory data (number, room type, price).
- Room status (Vacant, Occupied, Maintenance).
- Tenant log/history per room.

### C. Tenant Management Module
- Tenant profile data (Name, Contact, Address, Emergency Contact, Work/Study Status).
- Rental status (Active / Inactive).
- Log check-in date and check-out date.

### D. Payment & Expense Module
- Direct payment input by the operator.
- Upload payment proof/receipts.
- Invoice status (Unpaid, Paid, Overdue).

### E. Asset Management Module
- Master asset data (Bed, wardrobe, desk, chair, AC, fan, etc.).
- Asset status/condition per room (Good, Broken, Maintenance).
- Asset repair and maintenance history.

### F. Notification Module
- Payment due date reminders/notifications.
- Successful payment confirmation notifications.
- *(Optional)* Integration with WhatsApp Gateway.

### G. Reports & Dashboard Module
- KPI Dashboard (Total Income, Total Expenses, Cashflow).
- Room occupancy rate statistics.
- Tenant payment trend analytics.
