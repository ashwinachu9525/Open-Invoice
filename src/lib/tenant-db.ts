import "server-only";
import { prisma } from "./prisma";
import { Prisma } from "@prisma/client";

/**
 * Creates a strictly isolated Prisma Client for a specific tenant (Company).
 * All queries and writes through this client will automatically be scoped
 * to the provided `companyId`.
 */
export function getTenantDb(companyId: string) {
  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          // List of models that should NOT be tenant-scoped
          const globalModels = [
            "User",
            "Account",
            "Session",
            "VerificationToken",
            "Authenticator",
            "PasswordResetToken",
            "Company",
            "TeamInvitation",
          ];

          if (globalModels.includes(model)) {
            return query(args);
          }

          // Force TypeScript to treat args as any temporarily to inject where/data clauses
          const typedArgs = args as any;

          // Scope READ/UPDATE/DELETE operations
          if (
            [
              "findUnique",
              "findFirst",
              "findMany",
              "update",
              "updateMany",
              "delete",
              "deleteMany",
              "count",
              "aggregate",
              "groupBy",
            ].includes(operation)
          ) {
            typedArgs.where = { ...typedArgs.where, companyId };
          }

          // Scope CREATE operations
          if (["create", "createMany"].includes(operation)) {
            if (operation === "create") {
              typedArgs.data = { ...typedArgs.data, companyId };
            } else if (operation === "createMany") {
              if (Array.isArray(typedArgs.data)) {
                typedArgs.data = typedArgs.data.map((d: any) => ({
                  ...d,
                  companyId,
                }));
              } else {
                typedArgs.data = { ...typedArgs.data, companyId };
              }
            }
          }

          // Scope UPSERT operations
          if (["upsert"].includes(operation)) {
            typedArgs.where = { ...typedArgs.where, companyId };
            typedArgs.create = { ...typedArgs.create, companyId };
          }

          return query(typedArgs);
        },
      },
    },
  });
}
