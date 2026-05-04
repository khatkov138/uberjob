// components/modals/OrderGeoModal.tsx
"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { MapPin, Check, Loader2 } from "lucide-react"
import { AddressInput } from "./address-input"
import { handleAction } from "@/lib/utils"
import { getOrCreateLocation } from "@/actions/location/manage"
import { toast } from "sonner"

interface OrderGeoModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    initialData: { address: string; lat: number; lng: number; uri: string; locationId?: string }
    onConfirm: (data: any) => void
}

export function OrderGeoModal({ open, onOpenChange, initialData, onConfirm }: OrderGeoModalProps) {
    const [temp, setTemp] = React.useState(initialData)
    const [isCalibrating, setIsCalibrating] = React.useState(false)

    React.useEffect(() => {
        if (open) setTemp(initialData)
    }, [initialData, open])

    // Функция, которая вызывается при выборе из выпадающего списка
    const handleLocationSelect = async (item: any) => {
        setIsCalibrating(true)
        try {
            // Вызываем твой серверный экшен (он проверит базу или сходит в Яндекс)
            const location = await handleAction(
                getOrCreateLocation(item.uri, item.title.text)
            )

            setTemp({
                address: location.name,
                lat: location.lat,
                lng: location.lng,
                uri: location.yandexUri,
                locationId: location.id // Передаем ID из базы для связи с заказом
            })
        } catch (err) {
            toast.error("Ошибка калибровки локации")
        } finally {
            setIsCalibrating(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] p-0 border-none bg-white rounded-[3.5rem] shadow-2xl overflow-hidden">
                <div className="p-8 pb-4">
                    <DialogTitle className="text-4xl font-black italic tracking-tighter uppercase text-slate-900 leading-none">
                        Где встретимся<span className="text-blue-600">?</span>
                    </DialogTitle>
                </div>

                <div className="px-8 pb-8 space-y-6">
                    <div className="space-y-2">
                        <p className="ml-2 text-[9px] font-black uppercase text-slate-400 tracking-widest italic">
                            1. Найти населенный пункт
                        </p>
                        <AddressInput
                            defaultValue={temp.address}
                            onSelect={handleLocationSelect}
                        />
                    </div>

                    <div className="space-y-2">
                        <p className="ml-2 text-[9px] font-black uppercase text-slate-400 tracking-widest italic">
                            2. Уточнить точку на карте
                        </p>
                        <div className="h-[300px] w-full bg-slate-50 rounded-[2.5rem] border-2 border-slate-100 relative overflow-hidden group">
                            {isCalibrating ? (
                                <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-3">
                                    <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
                                    <span className="text-[10px] font-black uppercase italic text-blue-600 animate-pulse">Калибровка...</span>
                                </div>
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
                                    <MapPin className="w-8 h-8 text-blue-600 mb-2 animate-bounce" />
                                    <p className="text-[10px] font-black uppercase italic text-slate-400 max-w-[200px]">
                                        {temp.address || "Место не выбрано"}
                                        <br />
                                        <span className="text-blue-500/50">[Карта готова к пину]</span>
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    <button
                        onClick={() => onConfirm(temp)}
                        disabled={isCalibrating || !temp.address}
                        className="w-full h-20 bg-slate-900 hover:bg-blue-600 disabled:bg-slate-200 text-white rounded-[2rem] flex items-center justify-center gap-3 transition-all active:scale-95 group"
                    >
                        <span className="text-xl font-black uppercase italic tracking-tighter">
                            {isCalibrating ? "Синхронизация..." : "Подтвердить адрес"}
                        </span>
                        {!isCalibrating && <Check className="w-6 h-6 group-hover:scale-125 transition-transform" />}
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
