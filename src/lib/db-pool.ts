import "server-only"
import type { Pool as PgPool, PoolClient, QueryResult, QueryResultRow } from "pg"
import { existsSync, readFileSync } from "fs"

// ==============================================================================
// Types & Interfaces
// ==============================================================================

export interface PoolMetrics {
  totalCount: number
  idleCount: number
  waitingCount: number
  max: number
  provider: "postgresql"
}

export interface SslConfigResult {
  ssl: any
  cleanUrl: string
  isCloudProvider: boolean
}

interface GlobalPoolState {
  pool: PgPool | undefined
  configUrl: string | undefined
  maxConnections: number
  isShuttingDown: boolean
  shutdownRegistered: boolean
}

// ==============================================================================
// Global Singleton State (Survives Next.js Development Hot Reloads)
// ==============================================================================

const globalForPool = globalThis as unknown as {
  __openInvoicePgPoolState?: GlobalPoolState
}

if (!globalForPool.__openInvoicePgPoolState) {
  globalForPool.__openInvoicePgPoolState = {
    pool: undefined,
    configUrl: undefined,
    maxConnections: 2,
    isShuttingDown: false,
    shutdownRegistered: false,
  }
}

const poolState = globalForPool.__openInvoicePgPoolState

// ==============================================================================
// Aiven Cloud PostgreSQL & SSL/TLS Configuration Resolver
// ==============================================================================

/**
 * Strips interfering URL query parameters and resolves secure SSL/TLS configuration
 * tailored for Aiven Cloud PostgreSQL (and compatible cloud providers).
 */
export function buildSslConfig(rawDatabaseUrl: string): SslConfigResult {
  let cleanUrl = rawDatabaseUrl.trim()

  // Cloud providers require explicit SSL options on the pool.
  // Strip url-level ssl and pooling parameters so the pg driver does not conflict.
  try {
    const urlObj = new URL(cleanUrl)
    urlObj.searchParams.delete("sslmode")
    urlObj.searchParams.delete("ssl")
    urlObj.searchParams.delete("supa")
    urlObj.searchParams.delete("pool_mode")
    urlObj.searchParams.delete("pgbouncer")
    cleanUrl = urlObj.toString()
  } catch {
    cleanUrl = cleanUrl
      .replace(/[?&]sslmode=[^&]*/g, "")
      .replace(/[?&]ssl=[^&]*/g, "")
      .replace(/[?&]supa=[^&]*/g, "")
      .replace(/[?&]pool_mode=[^&]*/g, "")
      .replace(/[?&]pgbouncer=[^&]*/g, "")
      .replace(/\?$/, "")
      .replace(/&$/, "")
  }

  const isCloudProvider =
    rawDatabaseUrl.includes("aivencloud.com") ||
    rawDatabaseUrl.includes("aiven.io") ||
    rawDatabaseUrl.includes("supabase.com") ||
    rawDatabaseUrl.includes("neon.tech") ||
    rawDatabaseUrl.includes("aws.com") ||
    rawDatabaseUrl.includes("azure.com")

  const needsSsl =
    isCloudProvider ||
    /^postgres(ql)?s:\/\//i.test(rawDatabaseUrl) ||
    rawDatabaseUrl.includes("sslmode=require") ||
    rawDatabaseUrl.includes("sslmode=verify-full") ||
    rawDatabaseUrl.includes("sslmode=verify-ca") ||
    rawDatabaseUrl.includes("sslmode=prefer")

  // Check for custom CA certificate (Aiven Project CA certificate)
  const directCaCert = process.env.AIVEN_CA_CERT || process.env.DATABASE_CA_CERT
  const caCertPath = process.env.PGSSLROOTCERT || process.env.DATABASE_CA_CERT_PATH

  let caContent: string | undefined = undefined
  if (directCaCert && directCaCert.trim().length > 0) {
    caContent = directCaCert.trim()
  } else if (caCertPath && existsSync(caCertPath)) {
    try {
      caContent = readFileSync(caCertPath, "utf-8")
    } catch (readErr) {
      console.warn("[PostgreSQL Pool] Warning: Failed to read CA certificate from path:", caCertPath, readErr)
    }
  }

  let ssl: any = undefined
  if (caContent) {
    // Verified TLS with authoritative Aiven CA Certificate
    ssl = {
      ca: caContent,
      rejectUnauthorized: true,
    }
  } else if (needsSsl) {
    // Cloud provider TLS without custom root CA loaded in system truststore
    ssl = {
      rejectUnauthorized: false,
    }
  }

  return { ssl, cleanUrl, isCloudProvider }
}

/**
 * Returns the configured maximum pool connections.
 * Defaults strictly to 2 to stay well within Aiven Free tier's 20-connection cap.
 */
export function getMaxPoolConnections(): number {
  const envVal =
    process.env.DATABASE_POOL_SIZE ||
    process.env.DATABASE_MAX_CONNECTIONS ||
    process.env.PGMAXCONNECTIONS

  if (envVal) {
    const parsed = parseInt(envVal, 10)
    if (!isNaN(parsed) && parsed > 0) {
      return parsed
    }
  }

  // Strict default of 2 connections per backend instance
  return 2
}

// ==============================================================================
// Factory & Singleton Pool Manager
// ==============================================================================

function getPgConstructor(): typeof import("pg").Pool {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pgModule = require("pg")
  return pgModule.Pool || pgModule.default?.Pool || pgModule
}

/**
 * Creates and initializes a new pg.Pool with Aiven Free limits and leak protection.
 */
export function createNewPool(databaseUrl: string, maxConnectionsOverride?: number): PgPool {
  const PoolClass = getPgConstructor()
  const { ssl, cleanUrl } = buildSslConfig(databaseUrl)
  const max = maxConnectionsOverride ?? getMaxPoolConnections()

  const idleTimeoutMillis = parseInt(process.env.DATABASE_IDLE_TIMEOUT_MS || "2000", 10)
  const connectionTimeoutMillis = parseInt(process.env.DATABASE_CONNECT_TIMEOUT_MS || "5000", 10)
  const statementTimeout = parseInt(process.env.DATABASE_STATEMENT_TIMEOUT_MS || "20000", 10)

  const pool = new PoolClass({
    connectionString: cleanUrl,
    ssl,
    max,
    min: 0, // Never keep idle connections pinned when inactive
    idleTimeoutMillis, // Reclaim idle connection after 2s of inactivity
    connectionTimeoutMillis, // Fail fast (5s) if connection cannot be established
    statement_timeout: statementTimeout, // Prevent runaway queries from occupying pool slots
    allowExitOnIdle: true,
    application_name: "open-invoice-app",
  })

  // Prevent uncaught exceptions on idle connection drops (e.g., Aiven network teardown)
  pool.on("error", (err: Error, _client?: PoolClient) => {
    // Only log if not shutting down
    if (!poolState.isShuttingDown) {
      console.error("[PostgreSQL Pool Error] Unexpected error on idle client:", err.message)
    }
  })

  // Connection Leak Detection: Alert if a connection is checked out for >15s without release
  pool.on("acquire", (client: any) => {
    if (!client) return
    client.__checkoutTimestamp = Date.now()
    client.__leakWarningTimer = setTimeout(() => {
      const duration = Date.now() - (client.__checkoutTimestamp || 0)
      console.warn(
        `[PostgreSQL Pool Leak Warning] Connection checked out for ${duration}ms without release! ` +
        `Ensure all queries and transactions release connections in a finally block.`
      )
    }, 15000)

    if (client.__leakWarningTimer && client.__leakWarningTimer.unref) {
      client.__leakWarningTimer.unref()
    }
  })

  // In pg-pool, the event signature is emit('release', err, client)
  pool.on("release", (err: any, client: any) => {
    const targetClient = client || (err && typeof err === "object" && !("message" in err) ? err : undefined)
    if (targetClient && targetClient.__leakWarningTimer) {
      clearTimeout(targetClient.__leakWarningTimer)
      targetClient.__leakWarningTimer = undefined
    }
  })

  return pool
}

/**
 * Registers process lifecycle hooks for graceful shutdown.
 * Closes the shared pool and frees server sockets cleanly.
 */
function registerGracefulShutdown() {
  if (poolState.shutdownRegistered) return

  // Do not register process signal handlers during Next.js build or in serverless environments.
  // Next.js static generation workers use internal SIGINT/SIGTERM for worker coordination;
  // intercepting these signals during build causes premature pool termination and hangs onBuildComplete.
  const isBuildOrServerless =
    Boolean(process.env.VERCEL) ||
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.npm_lifecycle_event === "build" ||
    Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME) ||
    process.argv.some((arg) => arg.includes("build"))

  if (isBuildOrServerless) {
    return
  }

  poolState.shutdownRegistered = true

  const shutdownHandler = async (signal: string) => {
    if (poolState.isShuttingDown) return
    poolState.isShuttingDown = true

    if (poolState.pool) {
      try {
        console.log(`[PostgreSQL Pool] Closing shared pool on ${signal}...`)
        const poolToClose = poolState.pool
        poolState.pool = undefined
        await poolToClose.end()
      } catch (err) {
        console.error("[PostgreSQL Pool] Error during graceful shutdown:", err)
      }
    }
  }

  process.once("SIGTERM", () => shutdownHandler("SIGTERM"))
  process.once("SIGINT", () => shutdownHandler("SIGINT"))
}

/**
 * Returns the process-wide shared PostgreSQL connection pool singleton.
 * Guaranteed to be exactly ONE instance per Node.js process.
 */
export function getSharedPool(databaseUrl?: string): PgPool {
  // If a pool is already initialized and no URL override is provided, reuse it immediately
  if (poolState.pool && !databaseUrl) {
    return poolState.pool
  }

  const url =
    databaseUrl ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL

  if (!url) {
    if (poolState.pool) return poolState.pool
    throw new Error("Cannot initialize PostgreSQL pool: DATABASE_URL is not set.")
  }

  const { cleanUrl } = buildSslConfig(url)
  const max = getMaxPoolConnections()

  // Reuse existing pool if URL and max connections match
  if (poolState.pool && poolState.configUrl === cleanUrl && poolState.maxConnections === max) {
    return poolState.pool
  }

  // If URL or max changed during runtime, drain existing pool before replacing
  if (poolState.pool) {
    const oldPool = poolState.pool
    oldPool.end().catch((err) => {
      console.warn("[PostgreSQL Pool] Error draining old pool:", err)
    })
    poolState.pool = undefined
  }

  poolState.pool = createNewPool(url, max)
  poolState.configUrl = cleanUrl
  poolState.maxConnections = max

  registerGracefulShutdown()

  return poolState.pool
}

/**
 * Gracefully terminates the shared pool (used in testing and explicit shutdowns).
 */
export async function closeSharedPool(): Promise<void> {
  if (poolState.pool) {
    const poolToClose = poolState.pool
    poolState.pool = undefined
    poolState.configUrl = undefined
    await poolToClose.end().catch((err) => {
      console.warn("[PostgreSQL Pool] Error closing shared pool:", err)
    })
  }
}

// ==============================================================================
// Safe Parameterized Query & Transaction Helpers
// ==============================================================================

/**
 * Executes a parameterized SQL query on the shared pool.
 * Automatically handles client checkout, execution, error handling, and release.
 */
export async function query<T extends QueryResultRow = any>(
  text: string,
  params: any[] = []
): Promise<QueryResult<T>> {
  const pool = getSharedPool()
  return pool.query<T>(text, params)
}

/**
 * Executes a database transaction using a single dedicated connection from start to finish.
 * Guarantees connection checkout, BEGIN, COMMIT, ROLLBACK on error, and release in finally.
 */
export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const pool = getSharedPool()
  const client = await pool.connect()

  try {
    await client.query("BEGIN")
    const result = await callback(client)
    await client.query("COMMIT")
    return result
  } catch (error) {
    try {
      await client.query("ROLLBACK")
    } catch (rollbackError) {
      console.error("[PostgreSQL Transaction] Rollback error:", rollbackError)
    }
    throw error
  } finally {
    // Absolute guarantee that connection is returned to pool
    client.release()
  }
}

// ==============================================================================
// Pool Diagnostics & Health Telemetry
// ==============================================================================

/**
 * Returns instantaneous pool metrics (active, idle, waiting).
 */
export function getPoolMetrics(): PoolMetrics {
  const pool = poolState.pool
  if (!pool) {
    return {
      totalCount: 0,
      idleCount: 0,
      waitingCount: 0,
      max: getMaxPoolConnections(),
      provider: "postgresql",
    }
  }

  return {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
    max: poolState.maxConnections,
    provider: "postgresql",
  }
}

/**
 * Performs an active health check ping against PostgreSQL using the shared pool.
 */
export async function checkDatabaseHealth(): Promise<{
  healthy: boolean
  latencyMs: number
  metrics: PoolMetrics
  error?: string
}> {
  const start = Date.now()
  try {
    await query("SELECT 1")
    return {
      healthy: true,
      latencyMs: Date.now() - start,
      metrics: getPoolMetrics(),
    }
  } catch (err: any) {
    return {
      healthy: false,
      latencyMs: Date.now() - start,
      metrics: getPoolMetrics(),
      error: err.message || "Failed to reach database",
    }
  }
}
