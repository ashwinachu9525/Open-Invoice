# Getting Started & Installation

This guide will walk you through setting up Open-Invoice for local development.

---

## 📋 Prerequisites
Ensure you have the following installed on your local machine:
- **Node.js** (v20.x or higher)
- **NPM** (v10.x or higher)
- **SQLite3 / PostgreSQL** (SQLite is configured by default for rapid zero-dependency testing)

---

## 🛠️ Step-by-Step Installation

### Step 1: Clone the Repository
```bash
git clone https://github.com/yourusername/open-invoice.git
cd open-invoice
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Configure Database Provider
Open-Invoice utilizes an automated script to establish your database provider and generate correct schema adapters:
- **Configure SQLite (Default)**:
  ```bash
  npm run db:configure:sqlite
  ```
- **Configure PostgreSQL**:
  ```bash
  npm run db:configure:postgres
  ```

### Step 4: Run Database Migrations
Initialize the schema tables:
```bash
npx prisma db push
```

### Step 5: Start Local Development Server
Launch the compiler and start the Next.js server with Turbopack:
```bash
npm run dev
```
Open `http://localhost:3000` in your web browser.

---

## 🧪 Running Tests
We utilize `vitest` for fast, asynchronous testing:
```bash
npm run test
```
This runs the full suite of compliance, tax calculations, and AI assistant unit tests.
