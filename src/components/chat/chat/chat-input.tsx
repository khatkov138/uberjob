"use client"

import * as React from "react"
import TextareaAutosize from 'react-textarea-autosize'
import { Send, ShieldAlert, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface ChatInputProps {
    value: string
    onChange: (val: string) => void
    onSend: () => void
    isPending: boolean
    disabled: boolean
}

export function ChatInput({ value, onChange, onSend, isPending, disabled }: ChatInputProps) {
    // Состояние для мастеров в новых заказах
    if (disabled) {
        return (
            <footer className="p-6 md:p-8 bg-white border-t border-slate-100 shrink-0">
                <div className="bg-amber-50 border-2 border-amber-100 p-6 rounded-[2.5rem] flex items-center gap-4 animate-in slide-in-from-bottom-2">
                    <ShieldAlert className="text-amber-600 shrink-0" size={24} />
                    <p className="text-[10px] font-black uppercase text-amber-700 italic tracking-widest leading-tight">
                        Безопасность: Мастер может ответить только после вашего первого сообщения.
                    </p>
                </div>
            </footer>
        )
    }

    return (
        <footer className="p-6 md:p-8 bg-white border-t border-slate-100 shrink-0">
            <div className="p-4 bg-white border-t border-slate-100">
                <div className="relative flex items-end gap-2 max-w-4xl mx-auto min-h-[44px]">
                    {/* min-h-[44px] резервирует высоту для одной строки заранее */}

                    <textarea
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder="Напишите сообщение..."
                        rows={1}
                        className={cn(
                            "flex-1 w-full bg-slate-50 border-none rounded-2xl px-4 py-3",
                            "text-sm resize-none focus:ring-0 max-h-32",
                            "min-h-[44px] leading-[20px]", // Жестко задаем высоту строки и поля
                            "transition-none" // Убираем анимации на старт, чтобы не дергалось
                        )}
                        style={{ height: '44px' }} // Принудительно ставим высоту для первого кадра
                    />

                    <button
                        onClick={onSend}
                        disabled={disabled || !value.trim()}
                        className="mb-1 p-2 bg-blue-600 text-white rounded-xl shrink-0 hover:bg-blue-700 disabled:opacity-50 transition-all"
                    >
                        <Send size={18} />
                    </button>
                </div>
            </div>
        </footer>
    )
}
