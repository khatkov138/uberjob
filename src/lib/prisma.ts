

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../prisma/generated/client";
const globalForPrisma = global as unknown as {
    prisma: PrismaClient;
}; 
const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
}); 
const prisma =
    globalForPrisma.prisma ||
    new PrismaClient({
        adapter,
    });
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
export default prisma;

/*import { PrismaClient } from "./generated/prisma/client";

const prismaClientSingleton = () => {
    return new PrismaClient();
}
 
declare global {
    var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== "production") globalThis.prismaGlobal = prisma; 
*/