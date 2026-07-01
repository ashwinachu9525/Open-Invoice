# Tenant Database Isolation & Bring Your Own Database (BYODB)

For Enterprise tenants with strict data compliance constraints, Open-Invoice supports **Bring Your Own Database (BYODB)**.

---

## 🔒 Security & Key Rotation

- **Credentials Storage**: Custom PostgreSQL connections string URLs are encrypted using **AES-256-GCM** before being saved to the main platform database.
- **Dynamic Decryption**: The main database router decrypts and caches the pool connection on-the-fly.
- **Isolation Policy**: High-privacy tenants have absolute data isolation, as no invoicing records are stored on the shared main database server.

---

## ⚙️ Configuration Steps

1. Provision a PostgreSQL instance on AWS RDS, Supabase, Neon, or a private VPS.
2. Ensure the instance allows connections from the Open-Invoice server IP addresses.
3. In **Settings** -> **Database Configuration**:
   - Select **PostgreSQL** as the engine.
   - Enter your connection URL string:
     `postgresql://username:password@host:5432/dbname?sslmode=require`
4. Click **Verify Connection**:
   - The platform will verify the latency and connect.
   - It will automatically execute Prisma migration scripts to initialize your tables.
5. Click **Save Changes**. The server will dynamically hot-reload database connections for your tenant without any downtime.

---

## ⚠️ Connection Pool Limits
To prevent connection exhaustion at scale under serverless workloads:
- Pool size is automatically restricted to a maximum of **2 connections** per tenant in production.
- Connection caches are automatically cleared on idle cycles by the reaper middleware.
