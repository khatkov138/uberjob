import prisma from "@/lib/prisma";
import CreateMarketButton from "./CreateMarketButton";
import AdminMarketsFeed from "./AdminMarketsFeed";

import { Suspense } from "react";
import { adminMarketsQuery } from "@/lib/types";


async function getMarkets() {
  //  await new Promise(resolve => setTimeout(resolve, 1000));
    const markets = await prisma.market.findMany(adminMarketsQuery);
    return markets;
}

export default function AdminMarketsPage() {

    const markets = getMarkets();

    return (
        <div>
            <CreateMarketButton />
            <Suspense fallback={<div>Suspense...</div>}>
                <AdminMarketsFeed markets={markets} />
            </Suspense>
        </div>
    );
}