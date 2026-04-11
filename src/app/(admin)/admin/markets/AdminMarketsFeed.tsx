"use client"

import { useQuery } from "@tanstack/react-query";
import { AdminMarketsData } from "@/lib/types";
import DeleteMarketButton from "./DeleteMarketButton";
import kyInstance from "@/lib/ky";
import { use } from "react";

interface Props {
    markets: Promise<AdminMarketsData[]>
}

export default function AdminMarketsFeed({ markets }: Props) {

    const allMarkets = use(markets);

    const { isPending, isError, error, data } = useQuery({
        queryKey: ['admin', 'markets'],
        queryFn: () => kyInstance.get(
            "/api/admin/markets").json<AdminMarketsData[]>(),
        initialData: allMarkets,
    })

    if (isPending) {
        return <span>Loading...</span>
    }

    if (isError) {
        return <span>Ошибка загрузки</span>
    }


    return (
        <div className="flex gap-4">
            {data.map((market) => (
                <div key={market.id}>
                    <div>
                        {market.id}
                    </div>
                    <DeleteMarketButton id={market.id} />
                </div>
            ))}
        </div>
    );
}