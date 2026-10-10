# SmartERP (KEYbooks) ☁️

> **Cloud-native, keyboard-first double-entry ERP and inventory management system.**  
> Inspired by the ergonomics of **Tally Prime** and the cloud accessibility of **Zoho Books**, fully containerized and deployed on **AWS EC2** with **Nginx Load Balancing** and **GitHub Actions CI/CD**.

[![Deploy Status](https://img.shields.io/badge/AWS-EC2%20Deployed-FF9900?logo=amazonec2&logoColor=white)](#-deployment)
[![Docker](https://img.shields.io/badge/Docker-Compose%20Multi--Container-2496ED?logo=docker&logoColor=white)](#%EF%B8%8F-architecture)
[![Nginx](https://img.shields.io/badge/Nginx-Load%20Balancer%20(3%20Replicas)-009639?logo=nginx&logoColor=white)](#%EF%B8%8F-architecture)
[![Next.js](https://img.shields.io/badge/Next.js-15%20(App%20Router)-black?logo=next.js&logoColor=white)](#%EF%B8%8F-tech-stack)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](#%EF%B8%8F-tech-stack)
[![CI/CD](https://img.shields.io/badge/GitHub%20Actions-Automated%20CI%2FCD-2088FF?logo=githubactions&logoColor=white)](#-deployment)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](#license)

---

## 🚀 Live Demo

**Live Application Link:** [http://15.252.173.85](http://15.252.173.85)

| Environment | Access Link | Details |
| :--- | :--- | :--- |
| **Cloud Production** | **[Launch SmartERP App](http://15.252.173.85)** | Hosted on AWS EC2 via Nginx Reverse Proxy |
| **API Health Check** | `http://15.252.173.85/health` | Backend cluster health endpoint |
| **Replica Identifier** | `http://15.252.173.85/whoami` | Displays which backend replica served the request |

> [!WARNING]
> **HTTP Security Notice**: This application is currently running over **HTTP (not HTTPS)**. Please **do not use real passwords or sensitive personal / production financial data** until SSL/TLS certificates and HTTPS are configured via Certbot / Let's Encrypt.

> [!IMPORTANT]
> **Cloud Server & IP Notice**: The live deployment link is active only while the AWS EC2 instance is in the running state. Unless an AWS Elastic IP (static IP) is associated with the instance, stopping and starting the instance in the AWS Console will allocate a new public IP address. If the IP changes, update the live URL accordingly.

---

## 📖 About

**SmartERP (KEYbooks)** is a full-stack, cloud-hosted Enterprise Resource Planning (ERP) platform designed to eliminate the trade-off between legacy desktop accounting speed and modern web collaboration:

1. **The Legacy Dilemma**: Traditional desktop systems like *Tally Prime* offer rapid keyboard-only data entry but suffer from desktop isolation, local single-file database vulnerabilities, and lack of remote cloud collaboration.
2. **The Cloud Dilemma**: Mainstream SaaS applications like *QuickBooks* and *Zoho Books* offer web convenience but slow down skilled bookkeepers with mouse-dependent form fields and delayed report batch processing.
3. **The SmartERP Solution**: Combines desktop-grade keyboard ergonomics (hotkeys `F1`–`F9`, `Ctrl+K` omnisearch, `Enter` field flow) with a containerized cloud architecture running on AWS EC2. It delivers mathematical double-entry balance validation ($\sum \text{Debits} = \sum \text{Credits}$), real-time inventory valuations (FIFO & WAC), instantaneous financial statement computation, and database write mutexes to handle concurrent multi-user environments.

---

## 🛠️ Tech Stack

```
   ┌───────────────────────────────────────────────────────────────┐
   │                       CLIENT BROWSER                          │
   └───────────────────────────────┬───────────────────────────────┘
                                   │ HTTP (Port 5000 / 80)
                                   ▼
   ┌───────────────────────────────────────────────────────────────┐
   │                   NGINX REVERSE PROXY & LB                   │
   └───────────────┬───────────────────────────────┬───────────────┘
                   │ /api/* (Round-Robin)          │ / (Web Pages)
                   ▼                               ▼
   ┌───────────────────────────────┐   ┌───────────────────────────┐
   │   BACKEND CLUSTER (3 NODES)   │   │     NEXT.JS FRONTEND      │
   │  [Node 1]  [Node 2]  [Node 3] │   │     (React 19 / SSR)      │
   └───────────────┬───────────────┘   └───────────────────────────┘
                   │ Internal Network
                   ▼
   ┌───────────────────────────────┐
   │     POSTGRESQL 16 DATABASE    │
   │       (Persistent pgdata)     │
   └───────────────────────────────┘
```

| Layer | Technology | Version | Purpose & Implementation |
| :--- | :--- | :--- | :--- |
| **Frontend** | [Next.js](https://nextjs.org/) (App Router), React, TypeScript | 15.x / 19.x | High-performance server/client hybrid rendering, global shortcut context, responsive views |
| **Styling** | Tailwind CSS & CSS Variables | 4.x | High-contrast Dark and Light themes, accessible accounting tables |
| **Backend** | Node.js, Express | 5.x | RESTful API services, dual-auth session handling, transaction management |
| **Database** | PostgreSQL | 16-alpine | Relational ACID database, foreign-key constraints, financial ledgers, persistent volumes |
| **Reverse Proxy** | Nginx | 1.27-alpine | Single public gateway, round-robin load balancer across 3 backend replicas, health routing |
| **Containerization** | Docker & Docker Compose | Multi-container | Isolated container lifecycle for db, migrations, backend replicas, frontend, and Nginx |
| **Cloud Hosting** | AWS EC2 | Ubuntu Linux | Cloud virtual server hosting Docker Compose services with automated security group rules |
| **CI / CD** | GitHub Actions & GHCR | Workflow v4 | Automated unit/syntax validation and container image publishing to `ghcr.io` |
| **Authentication** | JWT & Bcrypt | - | Dual-token authentication (HTTP-only Cookies + `Bearer` header token fallback) |

---

## ✨ Features

### 1. 💼 Double-Entry Bookkeeping & Day Books
* **Strict Balance Enforcement**: Prevents imbalanced vouchers from saving ($\Delta = \text{Debit} - \text{Credit} = 0$).
* **Standard Voucher Types**: Post **Payment**, **Receipt**, **Journal**, **Sales**, and **Purchase** entries with automated opposite ledger suggestions.
* **Chronological Day Book**: Complete transaction audit log with toggleable drawer views inspecting raw double-entry debit/credit splits.
* **Cash & Bank Registers**: Real-time running balance calculators filterable by date ranges and specific ledgers.

### 2. 📦 Inventory Management (FIFO & Weighted Average Cost)
* **Valuation Models**: Dual valuation support for stock items:
  * **FIFO (First-In, First-Out)**: Sequentially consumes older inbound batches first.
  * **WAC (Weighted Average Cost)**: Recalculates unit valuation dynamically upon every inbound purchase batch.
* **Multi-Godown Storage**: Track stock items across distinct physical warehouses and storage points.
* **Low Stock Warnings**: Visual alerts triggered when inventory levels fall below pre-set reorder thresholds.

### 3. 📊 Dynamic Live Financial Reporting
* **Zero Cron/Delay Reports**: Computes directly from ledger transactional rows in real time:
  * **Trial Balance**: Instant verification of debit and credit equality across all active accounts.
  * **Profit & Loss Account**: Real-time gross and net profit margin calculations.
  * **Balance Sheet**: Cumulative view of company assets, liabilities, and capital equity.
* **Architect Specification Mode**: Embedded view revealing raw parameterized SQL queries, query latency, and database execution plans for full transparency.

### 4. ⌨️ Keyboard-First Ergonomics
* Replicates the speed of desktop terminals through dedicated global listeners:
  * `F1`: Master shortcuts cheat sheet modal
  * `F2`: Fiscal period / financial year selector
  * `F3`: Active company metadata switch
  * `F8` / `F9`: Direct shortcut to Sales / Purchase voucher creation
  * `Ctrl + K`: Universal command palette across ledgers, vouchers, and screens
  * `Alt + C`: Floating desktop calculator overlay with memory recall
  * `Enter` / `Down Arrow`: Next input progression without mouse clicks

### 5. 🛡️ Multi-User Mutex Locks & Multi-Company Tenancy
* **Database Mutex Locks (`system_locks`)**: Automatic distributed write lock preventing race conditions during settings or master data updates.
* **Audit Trails (`audit_logs`)**: JSON snapshots of every modified entity with user attribution.
* **Multi-Company Management**: Manage up to 5 distinct business entities with independent currencies, financial years, and Chart of Accounts.

---

## 🏗️ Architecture

SmartERP is designed as a modular, distributed multi-tier system orchestrated through Docker Compose:

```mermaid
graph TD
    Client["Client Browser (Desktop / Mobile)"]

    subgraph AWS ["AWS EC2 Cloud Instance"]
        subgraph NginxProxy ["Nginx Gateway (Port 5000 / 80)"]
            NGINX["Nginx Load Balancer / Reverse Proxy"]
        end

        subgraph AppCluster ["Application Tier (Internal Docker Network)"]
            FE["Next.js Frontend Container (:3000)"]
            BE1["Backend Replica 1 (:5000)"]
            BE2["Backend Replica 2 (:5000)"]
            BE3["Backend Replica 3 (:5000)"]
        end

        subgraph DataTier ["Data Tier (Docker Volume)"]
            MIG["Database Migration Runner (One-off)"]
            DB[("PostgreSQL 16 Engine (:5432)")]
            VOL[("Persistent Docker Volume (pgdata)")]
        end
    end

    Client -->|HTTP Requests| NGINX
    NGINX -->|Frontend Routes '/'| FE
    NGINX -->|API Routes '/api/*' (Round-Robin)| BE1
    NGINX -->|API Routes '/api/*' (Round-Robin)| BE2
    NGINX -->|API Routes '/api/*' (Round-Robin)| BE3

    MIG -->|Initializes Schema & Seeds| DB
    BE1 -->|Pooled SQL Connections| DB
    BE2 -->|Pooled SQL Connections| DB
    BE3 -->|Pooled SQL Connections| DB
    DB --- VOL
```

### Communication Flow:
1. **Public Gateway**: All client traffic reaches **Nginx** via port `5000` (or standard HTTP port `80`).
2. **Reverse Proxy & Load Balancing**:
   * Requests to `/api/*`, `/health`, and `/whoami` are distributed across **3 backend Express replicas** using round-robin scheduling.
   * If any backend replica becomes unresponsive, Nginx automatically retries another replica via `proxy_next_upstream`.
   * Standard browser traffic (`/`) is proxied directly to the **Next.js** frontend container.
3. **Internal Backend Network**: Backend containers communicate with PostgreSQL internally via service name `db:5432`, shielded from public internet exposure.
4. **Persistent Data**: Database records survive container restarts and deployments through the named volume `pgdata`.

---

## ☁️ Deployment

SmartERP is packaged for automated cloud deployment on an **AWS EC2** instance using Docker and GitHub Actions.

### 1. AWS EC2 Setup Details
* **Instance Type**: AWS EC2 `t2.micro` or `t3.small` running **Ubuntu 24.04 LTS**.
* **Security Group Inbound Rules**:
  | Type | Protocol | Port Range | Source | Purpose |
  | :--- | :--- | :--- | :--- | :--- |
  | SSH | TCP | 22 | My IP / Anywhere | Terminal server access |
  | Custom TCP | TCP | 5000 | 0.0.0.0/0 | Nginx Gateway (Public App URL) |
  | HTTP | TCP | 80 | 0.0.0.0/0 | Optional standard web port |

### 2. EC2 Host Preparation
SSH into your EC2 instance and install Docker and Docker Compose:

```bash
# Update package indices
sudo apt-get update -y && sudo apt-get upgrade -y

# Install Docker Engine & Docker Compose Plugin
sudo apt-get install -y docker.io docker-compose-v2
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
```

### 3. Deploying the Application via Docker Compose
Clone the repository and spin up the production stack:

```bash
# 1. Clone the repository
git clone https://github.com/antrasharma15/SmartERP.git
cd SmartERP

# 2. Configure production environment variables
cp .env.docker.example .env
nano .env   # Update POSTGRES_PASSWORD, JWT_SECRET, and APP_ENV=production

# 3. Launch all containers in detached mode
docker compose up -d --build

# 4. Verify running services
docker compose ps
```

You should see 6 containers running:
- `db` (PostgreSQL database)
- `migrate` (One-time migration script, completed)
- `backend` (3 running replica instances)
- `frontend` (Next.js server)
- `nginx` (Load balancer on port 5000)

### 4. Automated CI/CD Pipeline (GitHub Actions)
The repository includes `.github/workflows/ci-cd.yml` which executes on every push to `main`:
1. **Continuous Integration (Test Job)**:
   * Sets up Node.js 22.
   * Runs backend syntax validation (`node --check server.js`) and database configuration unit tests (`tests/dbConfig.test.js`).
   * Runs frontend TypeScript compilation check (`tsc --noEmit`).
   * Validates `docker-compose.yml` syntax.
2. **Continuous Deployment (Publish Job)**:
   * Builds production Docker images for backend and frontend.
   * Pushes versioned tags to **GitHub Container Registry (`ghcr.io`)**.


---

## 💻 Local Development Setup

To run SmartERP locally without cloud deployment:

### Method A: Quick Local Run with Docker (Recommended)
```bash
# Start all services with 3 backend replicas and Nginx
docker compose up --build

# Access the app at:
# Frontend / Gateway: http://localhost:5000
# Backend Health:     http://localhost:5000/health
```

Test load balancing across the 3 backend replicas:
```bash
# In PowerShell:
1..6 | ForEach-Object { curl.exe -s http://localhost:5000/whoami }
# Notice the container ID cycling across instances!
```

### Method B: Manual Native Setup
1. **Prerequisites**: Node.js `>= 18.0.0`, PostgreSQL `>= 14`.
2. **Backend**:
   ```bash
   cd backend
   npm install
   # Create backend/.env with DATABASE_URL, JWT_SECRET, PORT=5000
   npm run dev
   ```
3. **Frontend**:
   ```bash
   cd ../frontend
   npm install
   npm run dev
   # Access at http://localhost:3000
   ```

---

## 📂 Project Structure

```
├── .github/
│   └── workflows/
│       └── ci-cd.yml           # Automated CI/CD test, build, and GHCR registry push
├── backend/
│   ├── config/                 # PostgreSQL pool and mailer configuration
│   ├── controllers/            # Auth, Vouchers, Ledgers, Reports, Settings logic
│   ├── Middleware/             # JWT auth, concurrency write lock, rate limiters
│   ├── migrations/             # SQL schemas, seed data, and initDb runner
│   ├── models/                 # Database query models
│   ├── routes/                 # Express REST endpoint routes
│   └── server.js               # Express application entrypoint
├── frontend/
│   ├── src/app/
│   │   ├── (auth)/             # Login, signup, verification routes
│   │   ├── components/         # Modals, AppLayout, calculator, shortcut cheat sheet
│   │   ├── context/            # Auth, company, theme, and shortcut contexts
│   │   ├── reports/            # Balance Sheet, Trial Balance, P&L, Day Book views
│   │   ├── vouchers/           # Double-entry voucher posting interfaces
│   │   └── utils/              # Resilient dual-auth apiFetch client
│   └── src/assets/             # Application visual assets and branding
├── nginx/
│   └── nginx.conf              # Load balancing rules and reverse proxy routes
├── docker-compose.yml          # Multi-container service definitions & volume mappings
└── README.md                   # Project documentation and portfolio presentation
```

---

## 🗺️ Roadmap

- [ ] **Automated GST Returns**: Generate exportable GSTR-1 and GSTR-3B compliant JSON/Excel grids.
- [ ] **HTTPS / Let's Encrypt Integration**: Automated SSL renewal using Certbot sidecar container.
- [ ] **Bank Statement Reconciliation**: Auto-match CSV/OFX statement feeds with cash/bank registers.
- [ ] **PDF Invoice Templating**: Downloadable GST-compliant PDF invoice renderer with dynamic branding.

---

## 📄 License

This project is open-source and licensed under the [MIT License](LICENSE).

---

## 👤 Author & Acknowledgements

* **Developer**: **Antra Sharma**
* **GitHub**: [@antrasharma15](https://github.com/antrasharma15)
* **Repository**: [SmartERP on GitHub](https://github.com/antrasharma15/SmartERP)
* **Inspirations**: Special thanks to **Tally Prime** for the keyboard accounting workflows and **Zoho Books** for modern cloud ergonomics.
