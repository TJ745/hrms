// import { PrismaClient } from "@prisma/client";

// const globalForPrisma = globalThis as unknown as {
//   prisma: PrismaClient | undefined;
// };

// export const prisma =
//   globalForPrisma.prisma ??
//   new PrismaClient({
//     log:
//       process.env.NODE_ENV === "development"
//         ? ["query", "error", "warn"]
//         : ["error"],
//   });

// if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;


// import { PrismaClient } from "@prisma/client";
// import { PrismaNeon } from "@prisma/adapter-neon";
// import { neonConfig, Pool } from "@neondatabase/serverless";
// import ws from "ws";

// neonConfig.webSocketConstructor = ws;

// const globalForPrisma = globalThis as unknown as {
//   prisma: PrismaClient | undefined;
// };

// function createPrismaClient() {
//   const pool = new Pool({ connectionString: process.env.DATABASE_URL });
//   const adapter = new PrismaNeon(pool);
//   return new PrismaClient({
//     adapter,
//     log:
//       process.env.NODE_ENV === "development"
//         ? ["error", "warn"]
//         : ["error"],
//   });
// }

// export const prisma = globalForPrisma.prisma ?? createPrismaClient();

// if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;



// import { PrismaClient } from "@prisma/client";
// import { PrismaNeon } from "@prisma/adapter-neon";
// import { Pool, neonConfig } from "@neondatabase/serverless";
// import ws from "ws";

// // Required for Neon WebSocket connections in Node.js
// neonConfig.webSocketConstructor = ws;

// const globalForPrisma = globalThis as unknown as {
//   prisma: PrismaClient | undefined;
// };

// function createPrismaClient() {
//   const connectionString = process.env.DATABASE_URL;

//   console.log("DATABASE_URL =", connectionString);

//   if (!connectionString) {
//     throw new Error("DATABASE_URL environment variable is not set");
//   }

//   const pool    = new Pool({ connectionString });
//   const adapter = new PrismaNeon(pool);

//   return new PrismaClient({
//     adapter,
//     log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
//   });
// }

// export const prisma = globalForPrisma.prisma ?? createPrismaClient();

// if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;



import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  const pool    = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;