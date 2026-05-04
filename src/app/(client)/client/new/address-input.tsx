// @/components/orders/address-input.tsx
"use client"

import * as React from "react"
import { Search, MapPin, Loader2, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { handleApi } from "@/lib/utils"
import { cn } from "@/lib/utils"

interface AddressInputProps {
    defaultValue?: string
    // Теперь передаем весь объект suggestion, чтобы модалка сама решала, что с ним делать
    onSelect: (item: any) => void
    placeholder?: string
}

export function AddressInput({ defaultValue, onSelect, placeholder }: AddressInputProps) {
    const [query, setQuery] = React.useState(defaultValue || "")
    const [suggestions, setSuggestions] = React.useState<any[]>([])
    const [isLoading, setIsLoading] = React.useState(false)

    const fetchSuggestions = async (text: string) => {
        if (text.length < 3) {
            setSuggestions([])
            return
        }
        setIsLoading(true)
        try {
            const data = await handleApi<any[]>(
                fetch(`/api/geo/suggest?text=${encodeURIComponent(text)}`)
            )
            setSuggestions(data)
        } catch (err) {
            console.error("ZWORK_SUGGEST_ERROR:", err)
        } finally {
            setIsLoading(false)
        }
    }

    const handleItemClick = (item: any) => {
        setQuery(item.title.text) // Сразу подставляем текст в инпут
        setSuggestions([])         // Закрываем список
        onSelect(item)             // Передаем item в OrderGeoModal
    }

    return (
        <div className="relative w-full">
            <div className="relative group">
                <Search className={cn(
                    "absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors",
                    isLoading ? "text-blue-500 animate-pulse" : "text-slate-400"
                )} />

                <Input
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value)
                        fetchSuggestions(e.target.value)
                    }}
                    placeholder={placeholder || "Введите город или точный адрес..."}
                    className="h-16 pl-14 pr-12 rounded-2xl border-2 border-slate-100 bg-slate-50/50 focus:bg-white focus:border-blue-600 font-black italic text-lg uppercase tracking-tighter transition-all outline-none shadow-inner"
                />

                {query && !isLoading && (
                    <button
                        type="button"
                        onClick={() => { setQuery(""); setSuggestions([]); }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <X className="w-4 h-4 text-slate-400" />
                    </button>
                )}

                {isLoading && (
                    <div className="absolute right-5 top-1/2 -translate-y-1/2">
                        <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                    </div>
                )}
            </div>

            {/* Выпадающий список подсказок */}
            {suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-[2.5rem] shadow-2xl z-[70] overflow-hidden p-2 animate-in fade-in zoom-in-95 duration-200">
                    <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                        {suggestions.map((item, i) => (
                            <button
                                key={i}
                                type="button"
                                onClick={() => handleItemClick(item)}
                                className="w-full flex items-center gap-4 p-4 hover:bg-slate-50 rounded-2xl transition-all text-left group"
                            >
                                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-white group-hover:shadow-md transition-all">
                                    <MapPin className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="font-black uppercase italic text-sm tracking-tighter text-slate-900 leading-none mb-1 truncate">
                                        {item.title.text}
                                    </span>
                                    {item.subtitle?.text && (
                                        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 truncate">
                                            {item.subtitle.text}
                                        </span>
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
