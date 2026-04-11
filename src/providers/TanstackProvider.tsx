"use client";
import { ReactQueryStreamedHydration } from '@tanstack/react-query-next-experimental'

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";

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



    return (

        <QueryClientProvider client={queryClient}>
            <ReactQueryStreamedHydration>
                {children}
            </ReactQueryStreamedHydration>
            <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>

    );
}