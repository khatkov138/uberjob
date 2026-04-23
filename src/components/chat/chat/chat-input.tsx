"use client"

import * as React from "react"
import TextareaAutosize from 'react-textarea-autosize'
import { Send, ShieldAlert, Loader2 } from "lucide-react"

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
            <div className="flex gap-4 items-end bg-slate-50 p-2 rounded-[2.5rem] border-2 border-transparent focus-within:border-blue-600 focus-within:bg-white transition-all duration-300 shadow-inner">
                <TextareaAutosize
                    maxRows={5}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            if (value.trim() && !isPending) onSend()
                        }
                    }}
                    placeholder="НАПИШИТЕ СООБЩЕНИЕ..."
                    className="flex-1 min-h-[48px] py-4 px-8 bg-transparent outline-none font-black italic text-[11px] tracking-widest text-slate-900 placeholder:text-slate-300 uppercase resize-none scroll-smooth"
                />

                <button
                    onClick={onSend}
                    disabled={!value.trim() || isPending}
                    className="w-14 h-14 bg-slate-900 hover:bg-blue-600 disabled:bg-slate-200 text-white rounded-[1.8rem] flex items-center justify-center transition-all shrink-0 active:scale-95 shadow-xl mb-0.5"
                >
                    {isPending ? (
                        <Loader2 className="animate-spin" size={20} />
                    ) : (
                        <Send size={20} className="ml-1" />
                    )}
                </button>
            </div>
        </footer>
    )
}
