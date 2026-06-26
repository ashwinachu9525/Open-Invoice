-- ============================================================================
-- MASTER POSTGRESQL PERFORMANCE INDEXING SCRIPT
-- Project: Open-Invoice SaaS (indian-invoice-saas)
-- Target Engine: PostgreSQL 14+ (Aiven / Neon / Supabase / AWS RDS)
-- Execution: Run directly via psql or PgAdmin. Uses CONCURRENTLY for zero downtime.
-- Note: Do NOT execute this inside a BEGIN/COMMIT transaction block.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. CORE TENANT & MULTI-TENANCY FILTERING
-- Speeds up dashboard list lookups while ignoring soft-deleted rows
-- ----------------------------------------------------------------------------

-- Speed up tenant validation and soft-delete checks
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_company_active 
ON "Company" ("id") 
WHERE "deletedAt" IS NULL;

-- Speed up user authentication and team member lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_company_active 
ON "User" ("companyId", "role") 
WHERE "deletedAt" IS NULL;

-- Speed up CRM customer list searching and pagination
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customer_company_active 
ON "Customer" ("companyId", "name") 
WHERE "deletedAt" IS NULL;


-- ----------------------------------------------------------------------------
-- 2. HIGH-FREQUENCY INVOICE & QUOTATION QUERIES
-- Optimizes the main invoicing table for status tabs and date ordering
-- ----------------------------------------------------------------------------

-- Fast dashboard tab switching (e.g. "Show all OVERDUE invoices for Company X")
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoice_company_status 
ON "Invoice" ("companyId", "status") 
WHERE "deletedAt" IS NULL;

-- Fast chronological sorting on invoices table (default dashboard view)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoice_company_date 
ON "Invoice" ("companyId", "date" DESC) 
WHERE "deletedAt" IS NULL;

-- Fast quotation tab switching and chronological sorting
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quotation_company_status 
ON "Quotation" ("companyId", "status") 
WHERE "deletedAt" IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quotation_company_date 
ON "Quotation" ("companyId", "date" DESC) 
WHERE "deletedAt" IS NULL;


-- ----------------------------------------------------------------------------
-- 3. BACKGROUND CRON JOB ENGINE OPTIMIZATIONS (Inngest)
-- Drastically reduces CPU load when scanning thousands of rows every hour
-- ----------------------------------------------------------------------------

-- Instant hourly poll for processRecurringInvoices cron trigger
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recurring_schedule_active_run 
ON "RecurringSchedule" ("nextRunAt") 
WHERE "status" = 'ACTIVE';

-- Instant midnight scan for markOverdueInvoices & 9 AM payment reminders
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoice_overdue_scan 
ON "Invoice" ("dueDate") 
WHERE "status" NOT IN ('PAID', 'CANCELLED', 'DRAFT') 
  AND "balanceDue" > 0 
  AND "deletedAt" IS NULL;

-- Instant 8 AM scan for checkTrialReminders
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_company_trial_ending 
ON "Company" ("trialEndsAt") 
WHERE "trialStartsAt" IS NOT NULL 
  AND "trialReminderSent" IS NULL 
  AND "deletedAt" IS NULL;


-- ----------------------------------------------------------------------------
-- 4. FINANCIAL LEDGER & EXPENSE REPORTING
-- Speeds up financial chart aggregations on the main dashboard
-- ----------------------------------------------------------------------------

-- Fast payment collections sorting
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payment_invoice_date 
ON "Payment" ("invoiceId", "date" DESC);

-- Fast expense chart generation
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_expense_company_date 
ON "Expense" ("companyId", "date" DESC);


-- ----------------------------------------------------------------------------
-- 5. OBSERVABILITY & AUDIT TRAILS
-- Prevents slow table scans when viewing paginated logs
-- ----------------------------------------------------------------------------

-- Fast audit trail timeline rendering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_company_time 
ON "AuditLog" ("companyId", "createdAt" DESC);

-- Fast email log tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_email_log_company_time 
ON "EmailLog" ("companyId", "sentAt" DESC);

-- Fast expired OTP token cleanup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_password_reset_expiry 
ON "PasswordResetToken" ("expires");

-- ============================================================================
-- END OF INDEXING SCRIPT
-- ============================================================================