import { Prisma } from "../../prisma/generated/client";

export const adminUsersQuery = {
    include: { accounts: true },
} satisfies Prisma.UserFindManyArgs;

export type AdminUsersData = Prisma.UserGetPayload<typeof adminUsersQuery>;


export const adminMarketsQuery = {
    orderBy: {
        createdAt: "desc"
    },
    include: { showcases: true },
} satisfies Prisma.MarketFindManyArgs;

export type AdminMarketsData = Prisma.MarketGetPayload<typeof adminMarketsQuery>;
