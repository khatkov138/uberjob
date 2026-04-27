"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { MessageSquare } from "lucide-react"

import { ChatDialog } from "@/lib/types/chat"
import { DialogItem } from "./dialog-item"
import { getUserDialogs } from "@/actions/message/get"
import { handleAction } from "@/lib/utils"

interface DialogListProps {
    currentUserId: string
    activeUserId?: string
    initialData: ChatDialog[]
}

/**
 * Список всех активных диалогов (левая панель)
 */
export function DialogList({
    currentUserId,
    activeUserId,
    initialData
}: DialogListProps) {

    // Подключаем TanStack Query с начальными данными с сервера
    const { data: dialogs } = useQuery({
        queryKey: ["dialogs"],
        queryFn: () => handleAction(getUserDialogs()),
        initialData: initialData,
        // Данные считаются свежими 1 минуту, остальное сделает Pusher через useNotifications
        staleTime: 60 * 1000,
    })

    // Состояние пустой истории
    if (!dialogs || dialogs.length === 0) {
        return (
            <div className="p-12 text-center opacity-20 grayscale flex flex-col items-center justify-center h-full">
                <div className="w-16 h-16 bg-slate-50 rounded-[1.5rem] border-2 border-slate-100 flex items-center justify-center mb-4 italic font-black text-2xl shadow-inner text-slate-300">
                    !
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] italic text-slate-400">
                    Диалогов пока нет
                </p>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full overflow-y-auto no-scrollbar bg-white/50 backdrop-blur-sm">
            <div className="flex flex-col divide-y divide-slate-50">
                {dialogs.map((dialog) => {
                    // Защита от битых данных: если нет партнера или последнего сообщения
                    if (!dialog.partner || !dialog.lastMessage) return null;

                    return (
                        <DialogItem
                            key={`${dialog.partner.id}-${dialog.lastMessage.orderId || 'direct'}`}
                            dialog={dialog}
                            currentUserId={currentUserId}
                            isActive={activeUserId === dialog.partner.id}
                        />
                    )
                })}
            </div>

            {/* Визуальный отступ снизу для красоты скролла */}
            <div className="h-20 shrink-0" />
        </div>
    )
}
