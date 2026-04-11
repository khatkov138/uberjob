import { QueryFilters, useMutation, useQueryClient } from "@tanstack/react-query";

import { toast } from "sonner";


import { CreateMarket, DeleteMarket } from "./actions";
import { AdminMarketsData } from "@/lib/types";


export function useCreateMarket() {


    const queryClient = useQueryClient()

    const mutation = useMutation({
        mutationFn: CreateMarket,
        mutationKey: ["CreateMarket"],

        onSuccess: async (res) => {

            const queryFilter = {
                queryKey: ['admin', 'markets'],
            } satisfies QueryFilters;
            await queryClient.cancelQueries(queryFilter)

            if (res.error) {

                toast.error(res?.error)
            } else {

                queryClient.setQueriesData<AdminMarketsData[]>(
                    queryFilter,
                    (oldData) => {

                        if (!oldData || !res?.data) return;
                        return [res?.data, ...oldData]
                    }
                );

                toast.success("Market created")
               

            }


        },
        onError: (error) => {


            toast.error("Something went wrong")
        }
    })
    return mutation;
}

export function useDeleteMarket() {

    const queryClient = useQueryClient()

    const mutation = useMutation({
        mutationFn: (id: string) => DeleteMarket(id),
        mutationKey: ["DeleteMarket"],

        onSuccess: async (res) => {

            const queryFilter = {
                queryKey: ['admin', 'markets'],
            } satisfies QueryFilters;
            await queryClient.cancelQueries(queryFilter)

            if (res.error) {

                toast.error(res?.error)
            } else {

                queryClient.setQueriesData<AdminMarketsData[]>(
                    queryFilter,
                    (oldData) => {

                        if (!oldData || !res?.data) return;
                        const markets = oldData.filter((market) => market.id !== res.data.id)
                        return markets;
                    }
                );

                toast.success("Market  deleted")
               

            }


        },
        onError: (error) => {


            toast.error("Something went wrong")
        }
    })
    return mutation;
}