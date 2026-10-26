import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import {
  buildSslConfig,
  getMaxPoolConnections,
  getSharedPool,
  closeSharedPool,
  withTransaction,
  query,
  getPoolMetrics,
} from "@/lib/db-pool"

describe("Aiven Cloud PostgreSQL Pool & Leak Prevention", () => {
  const originalEnv = { ...process.env }

  beforeEach(async () => {
    process.env = { ...originalEnv }
    delete process.env.DATABASE_POOL_SIZE
    delete process.env.DATABASE_MAX_CONNECTIONS
    delete process.env.AIVEN_CA_CERT
    delete process.env.PGSSLROOTCERT
    await closeSharedPool()
  })

  afterEach(async () => {
    await closeSharedPool()
    process.env = { ...originalEnv }
  })

  it("should enforce default maximum connections of 2 for Aiven Free plan", () => {
    expect(getMaxPoolConnections()).toBe(2)
  })

  it("should allow configuring pool size via environment variables", () => {
    process.env.DATABASE_POOL_SIZE = "3"
    expect(getMaxPoolConnections()).toBe(3)

    process.env.DATABASE_MAX_CONNECTIONS = "4"
    delete process.env.DATABASE_POOL_SIZE
    expect(getMaxPoolConnections()).toBe(4)
  })

  it("should strip interfering URL query parameters and enable SSL for Aiven Cloud", () => {
    const aivenUrl = "postgresql://avnadmin:pass123@pg-test.aivencloud.com:11093/defaultdb?sslmode=require&supa=true&pool_mode=transaction"
    const { ssl, cleanUrl, isCloudProvider } = buildSslConfig(aivenUrl)

    expect(isCloudProvider).toBe(true)
    expect(cleanUrl).not.toContain("sslmode=require")
    expect(cleanUrl).not.toContain("supa=true")
    expect(cleanUrl).not.toContain("pool_mode=transaction")
    expect(cleanUrl).toContain("postgresql://avnadmin:pass123@pg-test.aivencloud.com:11093/defaultdb")
    expect(ssl).toEqual({ rejectUnauthorized: false })
  })

  it("should use custom CA certificate when provided in environment", () => {
    process.env.AIVEN_CA_CERT = "-----BEGIN CERTIFICATE-----\nMIIB...fake...cert\n-----END CERTIFICATE-----"
    const aivenUrl = "postgresql://user:pass@pg-test.aivencloud.com:11093/db"
    const { ssl } = buildSslConfig(aivenUrl)

    expect(ssl.rejectUnauthorized).toBe(true)
    expect(ssl.ca).toBe(process.env.AIVEN_CA_CERT)
  })

  it("should return the exact same singleton pool instance across multiple calls", () => {
    const testUrl = "postgresql://test:test@localhost:5432/testdb"
    const pool1 = getSharedPool(testUrl)
    const pool2 = getSharedPool(testUrl)

    expect(pool1).toBe(pool2)
    expect(pool1.options.max).toBe(2)
  })

  it("should track pool metrics accurately", () => {
    const testUrl = "postgresql://test:test@localhost:5432/testdb"
    getSharedPool(testUrl)
    const metrics = getPoolMetrics()

    expect(metrics.provider).toBe("postgresql")
    expect(metrics.max).toBe(2)
    expect(typeof metrics.totalCount).toBe("number")
    expect(typeof metrics.idleCount).toBe("number")
    expect(typeof metrics.waitingCount).toBe("number")
  })

  it("should execute transactions on a single dedicated connection and release on success", async () => {
    const mockClient: any = {
      query: vi.fn().mockResolvedValue({ rows: [] }),
      release: vi.fn(),
    }

    const mockPool: any = {
      connect: vi.fn().mockResolvedValue(mockClient),
      options: { max: 2 },
      totalCount: 1,
      idleCount: 1,
      waitingCount: 0,
      on: vi.fn(),
      end: vi.fn().mockResolvedValue(undefined),
    }

    const poolState = (globalThis as any).__openInvoicePgPoolState
    poolState.pool = mockPool
    poolState.configUrl = "postgresql://test"

    const result = await withTransaction(async (client) => {
      await client.query("UPDATE accounts SET balance = balance - 100 WHERE id = 1")
      await client.query("UPDATE accounts SET balance = balance + 100 WHERE id = 2")
      return { success: true }
    })

    expect(result).toEqual({ success: true })
    expect(mockClient.query).toHaveBeenCalledWith("BEGIN")
    expect(mockClient.query).toHaveBeenCalledWith("COMMIT")
    expect(mockClient.release).toHaveBeenCalledTimes(1)
  })

  it("should rollback transaction and guarantee connection release on error (no leak)", async () => {
    const mockClient: any = {
      query: vi.fn().mockImplementation((q: string) => {
        if (q.includes("FAILING_STATEMENT")) {
          return Promise.reject(new Error("Constraint violation"))
        }
        return Promise.resolve({ rows: [] })
      }),
      release: vi.fn(),
    }

    const mockPool: any = {
      connect: vi.fn().mockResolvedValue(mockClient),
      options: { max: 2 },
      totalCount: 1,
      idleCount: 1,
      waitingCount: 0,
      on: vi.fn(),
      end: vi.fn().mockResolvedValue(undefined),
    }

    const poolState = (globalThis as any).__openInvoicePgPoolState
    poolState.pool = mockPool
    poolState.configUrl = "postgresql://test"

    await expect(
      withTransaction(async (client) => {
        await client.query("INSERT INTO users (id) VALUES (1)")
        await client.query("FAILING_STATEMENT")
      })
    ).rejects.toThrow("Constraint violation")

    expect(mockClient.query).toHaveBeenCalledWith("BEGIN")
    expect(mockClient.query).toHaveBeenCalledWith("ROLLBACK")
    expect(mockClient.release).toHaveBeenCalledTimes(1)
  })

  it("should release client automatically on standard parameterized queries", async () => {
    const mockPool: any = {
      query: vi.fn().mockResolvedValue({ rows: [{ id: 1, name: "Test" }] }),
      options: { max: 2 },
      totalCount: 1,
      idleCount: 1,
      waitingCount: 0,
      on: vi.fn(),
      end: vi.fn().mockResolvedValue(undefined),
    }

    const poolState = (globalThis as any).__openInvoicePgPoolState
    poolState.pool = mockPool
    poolState.configUrl = "postgresql://test"

    const res = await query("SELECT * FROM users WHERE id = $1", [1])
    expect(res.rows[0].name).toBe("Test")
    expect(mockPool.query).toHaveBeenCalledWith("SELECT * FROM users WHERE id = $1", [1])
  })

  it("should close the shared pool during graceful shutdown", async () => {
    const mockPool: any = {
      end: vi.fn().mockResolvedValue(undefined),
      options: { max: 2 },
      totalCount: 0,
      idleCount: 0,
      waitingCount: 0,
    }

    const poolState = (globalThis as any).__openInvoicePgPoolState
    poolState.pool = mockPool
    poolState.configUrl = "postgresql://test"

    await closeSharedPool()

    expect(mockPool.end).toHaveBeenCalledTimes(1)
    expect(poolState.pool).toBeUndefined()
  })

  it("should clean up underlying pool when transient client disconnects", async () => {
    const { createPostgresClient } = await import("@/lib/prisma")
    const client = createPostgresClient("postgresql://test:test@localhost:5432/test", ["error"], 2)
    const attachedPool = (client as any).__pgPool

    expect(attachedPool).toBeDefined()
    expect(attachedPool.options.max).toBe(2)

    const endSpy = vi.spyOn(attachedPool, "end").mockResolvedValue(undefined)
    await client.$disconnect()

    expect(endSpy).toHaveBeenCalledTimes(1)
  })

  it("should handle high concurrency of queries without leaking connections", async () => {
    let activeClients = 0
    let maxObservedActive = 0

    const mockClient = {
      query: vi.fn().mockImplementation(async () => {
        activeClients++
        maxObservedActive = Math.max(maxObservedActive, activeClients)
        await new Promise((r) => setTimeout(r, 5))
        activeClients--
        return { rows: [] }
      }),
      release: vi.fn(),
    }

    const mockPool: any = {
      query: vi.fn().mockImplementation(async (text: string, params?: any[]) => {
        return mockClient.query(text, params)
      }),
      connect: vi.fn().mockResolvedValue(mockClient),
      options: { max: 2 },
      totalCount: 2,
      idleCount: 2,
      waitingCount: 0,
      on: vi.fn(),
      end: vi.fn().mockResolvedValue(undefined),
    }

    const poolState = (globalThis as any).__openInvoicePgPoolState
    poolState.pool = mockPool
    poolState.configUrl = "postgresql://test"

    // Simulate 20 concurrent requests
    const tasks = Array.from({ length: 20 }, (_, i) =>
      query("SELECT $1::text as val", [`task-${i}`])
    )

    const results = await Promise.all(tasks)
    expect(results).toHaveLength(20)
    expect(mockPool.query).toHaveBeenCalledTimes(20)
    expect(activeClients).toBe(0) // All returned cleanly
  })
})
