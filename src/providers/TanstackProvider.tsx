"use client";
import { ReactQueryStreamedHydration } from '@tanstack/react-query-next-experimental'

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState, useEffect } from "react";
// Добавляем импорт адаптера
import { broadcastQueryClient } from '@tanstack/query-broadcast-client-experimental';

export default function TanstackProvider({
    children,
}: {
    children: React.ReactNode;
}) {


    const [queryClient] = useState(
        () =>
            new QueryClient(

                {
                    defaultOptions: {

                        queries: {
                            staleTime: 60 * 1000, //6sec
                            //refetchOnMount: false,
                            //  refetchInterval: 30 * 1000,
                            refetchOnWindowFocus: true,
                            retry: false,


                        },

                    },

                }
            )
    );

    // Подключаем широковещание через useEffect, чтобы оно работало только на клиенте
    useEffect(() => {
        const unsubscribe = broadcastQueryClient({
            queryClient: queryClient as any,
            broadcastChannel: 'zwork-context-sync',
        });

        return () => unsubscribe();
    }, [queryClient]);

    return (

        <QueryClientProvider client={queryClient}>
            <ReactQueryStreamedHydration>
                {children}
            </ReactQueryStreamedHydration>
            <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>

    );
}
