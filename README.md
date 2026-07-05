# KEYbooks

> Keyboard-first double-entry accounting and stock inventory ERP system.

[![Status](https://img.shields.io/badge/Status-Academic_/_Internship_Project-blue.svg)](#project-context)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](#license)
[![Node Version](https://img.shields.io/badge/Node-%3E%3D_18.0.0-slate.svg)](#prerequisites)

KEYbooks is a keyboard-driven, web-based ERP application inspired by Tally and Zoho Books. Built as an academic capstone/internship project, it simulates rapid data-entry workflows for managing ledgers, double-entry vouchers, and FIFO/WAC-valued inventory within a concurrent multi-user database environment.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Screenshots](#screenshots)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Running Locally](#running-locally)
  - [Building for Production](#building-for-production)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [Database Schema](#database-schema)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)
- [Acknowledgements](#acknowledgements)
- [Contact](#contact)

---

## Features

### Accounting & Day Books
*   **Double-Entry Voucher System**: Create and record Payment, Receipt, Sales, and Purchase vouchers with automatic debit/credit balance matching and error prevention.
*   **Cash & Bank Registers**: View real-time running balances, filterable by date range and selected bank or cash ledgers.
*   **Chronological Day Book**: Browse all transactions chronologically with toggleable drill-down drawers to inspect double-entry debit/credit splits.

### Inventory Management
*   **Stock Valuations**: Tracks inventory flows using First-In, First-Out (FIFO) and Weighted Average Cost (WAC) valuation methodologies.
*   **Multi-Godown Tracking**: Assign and monitor items across multiple warehouse locations.
*   **Stock Warnings**: System-generated visual warnings when inventory levels fall below defined reorder levels.

### Dynamic Financial Reports
*   **Live Reports**: Instantly computes Trial Balance, Balance Sheet, and Profit & Loss statements directly from ledger transactional data.

### Platform Security & UX
*   **Multi-User Safety Locks**: Enforces central database mutex locks during settings and master data edits to prevent concurrency conflicts, supported by audit logging.
*   **Dual-Theme Layout**: Full interface support for high-contrast Light and Dark mode themes.
*   **Keyboard-First Navigation**: Binds quick-action shortcuts (e.g. Gateway hotkeys) to replicate desktop terminal accounting experiences.

---

## Tech Stack

| Layer | Technology | Key Usage |
| :--- | :--- | :--- |
| **Frontend** | Next.js (App Router), React, TypeScript | View renders, navigation contexts, keyboard listeners |
| **Styling** | Tailwind CSS v4 | Responsive utility styling, theme variables (Light/Dark) |
| **Backend** | Node.js, Express | REST API server, JWT session verification, mutex logic |
| **Database** | PostgreSQL | Relational transactional ledger schema |
| **Mailer** | Nodemailer | SMTP email verification and password resets |

---

## Screenshots

*Placeholders for user screenshots:*

```markdown
![KEYbooks Gateway Dashboard](/docs/screenshots/dashboard.png)
*Figure 1: Keyboard-driven Gateway dashboard.*

![Cash & Bank Book Register](/docs/screenshots/cash_bank_book.png)
*Figure 2: Cash & Bank ledger running balances.*

![Live Balance Sheet Report](/docs/screenshots/balance_sheet.png)
*Figure 3: Dynamically generated Balance Sheet.*
```

---

## Getting Started

### Prerequisites
*   **Node.js**: Version `>= 18.0.0`
*   **Database**: PostgreSQL `>= 14`
*   **SMTP Transporter**: Access to SMTP mail server (or falls back to mock console logs in development)

### Installation
1.  **Clone the Repository**:
    ```bash
    git clone https://github.com/antrasharma15/SmartERP.git
    cd SmartERP
    ```

2.  **Install Dependencies**:
    *   For the Backend:
        ```bash
        cd backend
        npm install
        ```
    *   For the Frontend:
        ```bash
        cd ../frontend
        npm install
        ```

3.  **Configure Environment Variables**:
    *   Create a `.env` file in the `backend/` directory (see the [Environment Variables](#environment-variables) section below for keys).

### Running Locally
1.  **Start the Backend**:
    ```bash
    cd backend
    npm run dev
    ```
    The API server starts on `http://localhost:5000`.

2.  **Start the Frontend**:
    ```bash
    cd ../frontend
    npm run dev
    ```
    Open `http://localhost:3000` in your web browser.

### Building for Production
*   **Build the Next.js Frontend**:
    ```bash
    cd frontend
    npm run build
    npm run start
    ```
*   **Run the Express Backend**:
    ```bash
    cd backend
    npm run start
    ```

---

## Environment Variables

Configure these keys inside your `backend/.env` file:

| Variable | Description | Example Value |
| :--- | :--- | :--- |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `PORT` | Backend port | `5000` |
| `JWT_SECRET` | Secret key for JWT signing | `your_long_secure_secret_key` |
| `NODE_ENV` | Run environment | `production` (or `development`) |
| `SMTP_HOST` | Outgoing SMTP mail server | `smtp.mailtrap.io` |
| `SMTP_PORT` | SMTP connection port | `587` |
| `SMTP_USER` | SMTP username | `your_smtp_user` |
| `SMTP_PASS` | SMTP password | `your_smtp_password` |
| `FRONTEND_URL` | Application root web URL | `http://localhost:3000` |

---

## Project Structure

```
├── backend/
│   ├── config/          # Database & SMTP configurations
│   ├── controllers/     # Controller logic (Auth, Settings, Ledgers, Vouchers)
│   ├── Middleware/      # JWT checks, Concurrency locks, Rate limiting
│   ├── models/          # Parameterized PostgreSQL model queries
│   ├── routes/          # API route definitions
│   └── server.js        # Server entry point
├── frontend/
│   ├── public/          # Favicons, logo badges, images
│   └── src/app/         # Next.js pages, reports, dashboard, layouts
│       ├── context/     # Global state and contexts
│       └── utils/       # API call wrappers
└── docs/                # Screenshots and specifications
```

---

## Database Schema

KEYbooks utilizes a PostgreSQL database structure. Core tables include:
*   **`users`**: Customer/operator profile credentials.
*   **`companies`**: Profile details for the active business entity.
*   **`company_users`**: Maps roles (`owner`, `admin`, `accountant`, `viewer`) to users.
*   **`ledgers`**: Accounting heads mapped under Tally groups.
*   **`vouchers`**: Transaction headers (Purchase/Sales dates and narrations).
*   **`voucher_entries`**: Double-entry ledger splits (Debits/Credits).
*   **`stock_items`**: Stock inventory entities.
*   **`stock_transactions`**: FIFO/WAC transactions for buying/selling goods.
*   **`system_locks`**: Active mutex concurrency logs.

*Note: Database setups and triggers reside inside the SQL scripts in [backend/migrations](file:///c:/Users/hp/SmartERP/backend/migrations).*

---

## Roadmap

Planned features under design:
- [ ] **GST Filing Automation**: Export GSTR-1 and GSTR-2 format grids.
- [ ] **Bank Reconciliation**: Upload bank statements (CSV/OFX) to match book registers.
- [ ] **Cheque Management**: Track and print issued/received cheque balances.
- [ ] **PDF Invoice Generator**: Dynamic styling engine for downloading invoices.

---

## Contributing

1.  Fork the repository.
2.  Create your feature branch (`git checkout -b feature/AmazingFeature`).
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4.  Push to the branch (`git push origin feature/AmazingFeature`).
5.  Open a Pull Request.

---

## License

This project is licensed under the MIT License - see the `LICENSE` file for details.

---

## Acknowledgements

*   Inspiration for user flows drawn from **Tally Prime** and **Zoho Books** accounting paradigms.
*   Next.js and Tailwind CSS template structures.

---

## Contact

*   **Developer**: Antra Sharma
*   **GitHub**: [@antrasharma15](https://github.com/antrasharma15)
*   **Project Link**: [SmartERP / KEYbooks](https://github.com/antrasharma15/SmartERP)
