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
    // Обработка отправки через Ctrl+Enter или Enter (без Shift)
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (value.trim() && !isPending && !disabled) {
                onSend();
            }
        }
    }

    if (disabled) {
        return (
            <footer className="p-4 md:p-6 bg-white border-t border-slate-100 shrink-0">
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-1">
                    <ShieldAlert className="text-amber-600 shrink-0" size={20} />
                    <p className="text-xs font-medium text-amber-800 leading-tight">
                        Безопасность: Мастер может ответить только после вашего первого сообщения.
                    </p>
                </div>
            </footer>
        )
    }

    return (
        <footer className="p-4 md:p-6 bg-white border-t border-slate-100 shrink-0">
            <div className="max-w-4xl mx-auto">
                <div className="relative flex items-end gap-3 bg-slate-50 rounded-[1.5rem] p-2 border border-slate-200 focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-400/20 transition-all">

                    <TextareaAutosize
                        cacheMeasurements // Важно: ускоряет повторные рендеры
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Напишите сообщение..."
                        minRows={1}
                        maxRows={5}
                        className={cn(
                            // Добавляем h-[40px], чтобы браузер зарезервировал место ДО загрузки JS
                            "flex-1 w-full bg-transparent border-none rounded-xl px-3 h-[40px]",
                            "text-sm resize-none focus:outline-none focus:ring-0",
                            "py-[10px] leading-[20px] overflow-hidden"
                        )}
                    />

                    <button
                        onClick={onSend}
                        disabled={!value.trim() || isPending}
                        className={cn(
                            "flex items-center justify-center shrink-0 transition-all duration-200",
                            "h-10 w-10 md:h-12 md:w-12 rounded-2xl", // Увеличенный размер
                            "bg-blue-600 text-white shadow-lg shadow-blue-600/20",
                            "hover:bg-blue-700 active:scale-95",
                            "disabled:bg-slate-300 disabled:shadow-none disabled:scale-100"
                        )}
                    >
                        {isPending ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                            <Send className={cn(
                                "h-5 w-5 transition-transform",
                                value.trim() ? "translate-x-0.5 -translate-y-0.5" : ""
                            )} />
                        )}
                    </button>
                </div>
                <p className="text-[10px] text-center text-slate-400 mt-2">
                    Нажмите Enter для отправки
                </p>
            </div>
        </footer>
    )
}
