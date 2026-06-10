export type DatabaseProvider = "sqlite" | "postgresql"

export interface DatabaseConfig {
  provider: DatabaseProvider
  postgresqlUrl?: string
}
