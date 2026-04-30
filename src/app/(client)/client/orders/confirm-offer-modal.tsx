"use client"

import * as React from "react"
import { X, Zap, Loader2 } from "lucide-react"
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import { handleAction } from "@/lib/utils"

import { ClientOrder, getClientOrders } from "@/actions/order/get"
import { acceptOffer } from "@/actions/offer/manage"

interface ConfirmOfferModalProps {
    ids: { orderId: string; offerId: string } | null
    onClose: () => void
}

export function ConfirmOfferModal({ ids, onClose }: ConfirmOfferModalProps) {
    const queryClient = useQueryClient()

    const orders = queryClient.getQueryData<ClientOrder[]>(["client-orders"]) || []

    // Тот же поиск, что и был
    const displayData = React.useMemo(() => {
        if (!ids) return null
        const order = orders.find((o) => o.id === ids.orderId)
        const offer = order?.offers.find((off) => off.id === ids.offerId)

        if (!offer) return null
        return {
            workerName: offer.worker.name,
            price: offer.price,
        }
    }, [ids, orders])

    // 3. Мутация принятия оффера
    const mutation = useMutation({
        mutationFn: (vars: { orderId: string; offerId: string }) =>
            handleAction(acceptOffer(vars.orderId, vars.offerId)),
        onSuccess: () => {
            toast.success("ИСПОЛНИТЕЛЬ УТВЕРЖДЕН", {
                className: "bg-blue-600 text-white font-black italic uppercase",
            })
            // Обновляем список, чтобы статусы изменились
            queryClient.invalidateQueries({ queryKey: ["client-orders"] })
            onClose()
        },
        onError: (err: Error) => toast.error(err.message),
    })

    if (!ids || !displayData) return null

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/80 backdrop-blur-md"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative bg-white rounded-[3rem] p-10 max-w-md w-full shadow-2xl border-4 border-slate-900 overflow-hidden">
                {/* Декор на фоне */}
                <Zap className="absolute -bottom-10 -right-10 w-40 h-40 opacity-[0.03] text-slate-900 -rotate-12 pointer-events-none" />

                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 p-2 hover:bg-slate-100 rounded-full transition-colors z-10"
                >
                    <X className="w-6 h-6" />
                </button>

                <div className="space-y-6 text-center relative z-10">
                    <div className="w-20 h-20 bg-blue-600 text-white rounded-3xl flex items-center justify-center mx-auto rotate-3 shadow-xl">
                        <Zap className="w-10 h-10 fill-current" />
                    </div>

                    <div className="space-y-2">
                        <h3 className="text-3xl font-black uppercase italic tracking-tighter leading-tight">
                            Утвердить <span className="text-blue-600">мастера?</span>
                        </h3>
                        <p className="text-slate-500 font-bold italic text-sm">
                            Вы нанимаете {displayData.workerName} за {displayData.price / 100} ₽
                        </p>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            disabled={mutation.isPending}
                            onClick={onClose}
                            className="flex-1 h-16 rounded-2xl border-2 border-slate-100 font-black uppercase italic text-[11px] text-slate-400 hover:bg-slate-50 transition-all disabled:opacity-50"
                        >
                            Отмена
                        </button>
                        <button
                            disabled={mutation.isPending}
                            onClick={() => mutation.mutate({
                                orderId: ids.orderId,
                                offerId: ids.offerId
                            })}
                            className="flex-1 h-16 rounded-2xl bg-blue-600 text-white font-black uppercase italic text-[11px] hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all flex items-center justify-center min-w-[140px]"
                        >
                            {mutation.isPending ? (
                                <Loader2 className="animate-spin w-5 h-5" />
                            ) : (
                                "ПОДТВЕРДИТЬ"
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
