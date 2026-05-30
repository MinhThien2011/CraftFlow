# 🎨 CraftFlow

### Smart Inventory Management and Craft Production Coordination System

---

## 📋 Project Information

| Information        | Details                                                                         |
| ------------------ | ------------------------------------------------------------------------------- |
| **Team Code**      | C2SE.70                                                                         |
| **Project Title**  | CraftFlow - Smart Inventory Management and Craft Production Coordination System |
| **Team Members**   | Pham Minh Thien, Ngo Thi Kim Nguyen, Nguyen Quach Khang Ninh, Pham Cong Huy     |
| **Project Mentor** | MSc. Sanh Tran Kim                                                              |
| **Academic Year**  | 2025 - 2026                                                                     |

---

## ⚙️ Requirements & Setup

### System Requirements

* Node.js v18+
* npm or yarn
* Git
* MongoDB
* Redis

### Required Tools

| Tool       | Version | Purpose                           |
| ---------- | ------- | --------------------------------- |
| Node.js    | 18+     | Runtime Environment               |
| npm / yarn | Latest  | Package Management                |
| MongoDB    | Latest  | Primary Database                  |
| Redis      | Latest  | Caching & Real-Time Communication |
| Cloudinary | Latest  | Image Storage                     |
| Git        | Latest  | Version Control                   |

---

## 🚀 Installation Guide

### 1. Clone Repository

```bash
git clone https://github.com/MinhThien2011/CraftFlow.git
cd CraftFlow
```

### 2. Setup Backend

```bash
cd backend

npm install
# or
yarn install

# Create environment file
cp .env.example .env

# Start development server
npm run dev
```

### 3. Setup Frontend

```bash
cd frontend

npm install
# or
yarn install

# Start development server
npm run dev
```

### 4. Access Application

| Service     | URL                   |
| ----------- | --------------------- |
| Frontend    | http://localhost:3000 |
| Backend API | http://localhost:4000 |

---

## 📖 Project Overview

CraftFlow is a Smart Inventory Management and Craft Production Coordination System designed for small and medium-sized handmade manufacturing businesses.

The platform centralizes inventory, warehouse operations, purchasing, and production management into a single system. By replacing spreadsheet-based and paper-based processes, CraftFlow helps organizations improve operational efficiency, reduce inventory discrepancies, and gain better visibility into production activities.

The system also integrates an AI-powered assistant to support users with operational guidance and information retrieval.

### 🎯 Problem Statement

Many handmade manufacturing businesses still rely on spreadsheets and manual documentation to manage inventory and production activities. This often leads to:

* Inventory inaccuracies
* Inefficient production coordination
* Limited visibility into material consumption
* Difficulties tracking production costs
* Delays in warehouse operations
* Ineffective inventory planning

### ✅ Solution

CraftFlow provides a centralized platform for managing materials, inventory, production orders, warehouse transactions, purchasing workflows, and operational reporting.

Key benefits include:

* Real-time inventory visibility
* Structured production management
* Warehouse traceability through batch tracking
* Automated inventory movement recording
* Role-based access control
* AI-assisted operational support
* Improved decision-making through reporting and analytics

---

## 👥 User Roles

### Administrator

* Manage users and roles
* Approve purchase orders
* Monitor system activities
* View system logs
* Manage system settings

### Production Manager

* Manage products, materials, and BOMs
* Create and manage production orders
* Assign production tasks
* Monitor production progress
* Create purchase orders
* Create material issue requests
* Manage finished goods receiving

### Warehouse Manager

* Manage inventory operations
* Process goods receipts and goods issues
* Perform stock counting and adjustments
* Manage warehouse locations
* Track inventory batches and lots
* Monitor inventory alerts

### Staff

* View assigned production tasks
* Report production progress
* Update completed quantities
* View production instructions and BOM information

---

## ✨ Key Features

### 🔐 User & Access Management

* Secure authentication and authorization
* JWT-based authentication
* Role-based access control
* User profile management
* Password management

### 🧱 Material Management

* Material creation and maintenance
* Material categorization
* Unit management
* Material cost management
* Material consumption tracking

### 📦 Inventory & Warehouse Management

* Inventory tracking and control
* Goods receipt management
* Goods issue management
* Stock counting and adjustment
* Inventory transaction history
* Low stock alerts
* Batch/Lot traceability
* Warehouse location management
* QR code scanning support

### 🛒 Purchasing Management

* Purchase order creation
* Purchase order approval workflow
* Goods receiving process
* Purchasing history tracking

### 🏭 Production Management

* Product management
* Bill of Materials (BOM) management
* Production order management
* Production task assignment
* Production progress tracking
* Material issue requests
* Finished goods receiving
* Production performance monitoring

### 🔔 Notifications & Real-Time Updates

* Real-time notifications
* Inventory alerts
* Production updates
* Task assignment notifications
* System announcements

### 🤖 AI Assistant

* AI-powered operational support
* Information retrieval assistance
* Workflow guidance
* User support chatbot

### 📊 Reporting & Analytics

* Inventory reports
* Production reports
* Cost analysis
* Inventory movement tracking
* Operational performance monitoring

---

## 📂 Project Structure

```text
CraftFlow/
│
├── backend/                            # Backend API Server
│   ├── app.js                          # Express Application Setup
│   ├── index.js                        # Application Entry Point
│   ├── package.json
│   │
│   ├── config/                         # Application Configurations
│   ├── controllers/                    # Request Handlers
│   ├── middleware/                     # Custom Middleware
│   ├── models/                         # Mongoose Models
│   ├── routes/                         # API Routes
│   ├── services/                       # Business Logic
│   ├── validations/                    # Request Validation
│   ├── utils/                          # Utility Functions
│   └── seeds/                          # Database Seed Data
│
├── frontend/                           # Next.js Web Application
│   ├── src/
│   │   ├── app/                        # Next.js App Router
│   │   ├── components/                 # Reusable Components
│   │   ├── hooks/                      # Custom Hooks
│   │   ├── lib/                        # Utilities & Configurations
│   │   ├── services/                   # API Services
│   │   ├── providers/                  # React Providers
│   │   └── types/                      # Type Definitions
│   │
│   ├── package.json
│   ├── tsconfig.json
│   └── next.config.mjs
│
└── README.md
```

---

## 🛠 Technology Stack

### Frontend

* Framework: Next.js 15
* Language: TypeScript
* Styling: Tailwind CSS + PostCSS
* UI Components: Radix UI
* State Management: TanStack Query (React Query)
* Form Management: React Hook Form
* HTTP Client: Axios
* Icons: Lucide React
* QR Scanner: React QR Scanner

### Backend

* Runtime: Node.js (v18+)
* Framework: Express.js 5.x
* Database ODM: Mongoose
* Authentication: JWT + bcryptjs
* Validation: Joi
* Caching: Redis
* Real-Time Communication: Socket.io
* File Upload: Multer
* Cloud Storage: Cloudinary
* AI Integration: Google Gemini API

### Security & Utilities

* Helmet
* CORS
* Rate Limiting
* Compression
* Morgan Logging
* dotenv

### Database & Storage

* MongoDB Atlas – Primary Database
* Redis – Caching and Real-Time Communication
* Cloudinary – Image and Document Storage

### Development Tools

* Git & GitHub
* npm / yarn
* Sharp
* Postman

---

## 🔒 Security Features

* JWT Authentication
* Password Hashing with bcrypt
* Role-Based Authorization
* API Rate Limiting
* Secure HTTP Headers
* Request Validation
* Environment Variable Protection

---

## 📈 Future Enhancements

* Advanced Analytics Dashboard
* Production Forecasting
* Supplier Management
* Mobile Application
* Advanced AI Recommendations
* Multi-Warehouse Support
* ERP Integration
* Barcode/QR-based warehouse operations
* Production scheduling optimization
* AI-assisted inventory forecasting
---

## 📄 License

This project is licensed under the MIT License.

See the LICENSE file for more details.

---

## 📞 Support

If you encounter any issues or have questions:

* Create an Issue on GitHub
* Contact the development team

---

**Created:** April 2026

**Last Updated:** May 2026

**Version:** 2.0.0

**Status:** Stable Release

**Project Type:** Academic Project
---

Developed for Software Engineering Capstone Project – Duy Tan University.
