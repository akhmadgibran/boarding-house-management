import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import "dotenv/config";

// inisialisasi adapter langsung
const adapter = new PrismaMariaDb(`${process.env.DATABASE_URL}`);

// export 1 instance PrismaClient untuk dibagi keseluruh aplikasi

export const prisma = new PrismaClient({ adapter, log: ['query', 'error'] });
