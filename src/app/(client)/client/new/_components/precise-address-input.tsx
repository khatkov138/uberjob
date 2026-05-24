"use client"

import * as React from "react"
import { Search, MapPin, Loader2, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { handleApi, cn } from "@/lib/utils"
import { useDebounce } from "@/hooks/use-debounce"

interface AddressSuggestItem {
    title: { text: string }
    subtitle?: { text: string }
    uri: string
}

interface PreciseAddressInputProps {
    defaultValue?: string
    onSelect: (item: AddressSuggestItem) => void
    placeholder?: string
    boundedCoords: [number, number]
}

export function PreciseAddressInput({ defaultValue, onSelect, placeholder, boundedCoords }: PreciseAddressInputProps) {
    const [query, setQuery] = React.useState(defaultValue || "")
    const [suggestions, setSuggestions] = React.useState<AddressSuggestItem[]>([])
    const [isLoading, setIsLoading] = React.useState(false)
    
    // 🔥 ФЛАГ ДЛЯ ЗАЩИТЫ UX: Следим, держит ли пользователь фокус на инпуте
    const [isFocused, setIsFocused] = React.useState(false)
    const isFirstRender = React.useRef(true)

    const debouncedQuery = useDebounce(query, 300)

    // Синхронизация: когда карта присылает новый адрес, мы просто пишем его в текст инпута
    React.useEffect(() => {
        if (defaultValue !== undefined) {
            setQuery(defaultValue)
        }
    }, [defaultValue])

    React.useEffect(() => {
        if (isFirstRender.current && debouncedQuery === defaultValue) {
            isFirstRender.current = false 
            return
        }

        const fetchAddresses = async () => {
            // 🔥 ГЛАВНЫЙ ФИКС: Если пользователь НЕ держит фокус на инпуте (то есть адрес прилетел с карты),
            // мы полностью гасим сетевой запрос и очищаем старые подсказки!
            if (!isFocused) {
                setSuggestions([])
                return
            }

            if (debouncedQuery.length < 3) {
                setSuggestions([])
                return
            }

            setIsLoading(true)
            try {
                const [lat, lng] = boundedCoords
                const url = `/api/geo/suggest?text=${encodeURIComponent(debouncedQuery)}&lat=${lat}&lng=${lng}`

                const data = await handleApi<AddressSuggestItem[]>(fetch(url))
                setSuggestions(data || [])
            } catch (err) {
                console.error("ADDRESS_SUGGEST_ERROR:", err)
            } finally {
                setIsLoading(false)
            }
        }

        fetchAddresses()
    }, [debouncedQuery, defaultValue, boundedCoords, isFocused]) // Добавили isFocused в зависимости

    const handleItemClick = (item: AddressSuggestItem) => {
        isFirstRender.current = false 
        setQuery(item.title.text)
        setSuggestions([])
        onSelect(item)
    }

    return (
        <div className="relative w-full">
            <div className="relative group">
                <Search className={cn(
                    "absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors z-10",
                    isLoading ? "text-blue-500 animate-pulse" : "text-slate-400"
                )} />

                <Input
                    value={query}
                    onChange={(e) => {
                        isFirstRender.current = false 
                        setQuery(e.target.value)
                    }}
                    // 🔥 Управляем состоянием фокуса
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => {
                        // Небольшой таймаут, чтобы клик по подсказке успел сработать до размонтирования списка
                        setTimeout(() => setIsFocused(false), 200)
                    }}
                    placeholder={placeholder || "Введите улицу и номер дома..."}
                    className="h-16 pl-14 pr-12 rounded-2xl border-2 border-slate-100 bg-slate-50/50 focus:bg-white focus:border-blue-600 font-black italic text-lg uppercase tracking-tighter transition-all outline-none shadow-inner"
                />

                {query && (
                    <button
                        type="button"
                        onClick={() => { isFirstRender.current = false; setQuery(""); setSuggestions([]); }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 hover:bg-slate-100 rounded-full transition-colors z-10"
                    >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin text-blue-600" /> : <X className="w-4 h-4 text-slate-400" />}
                    </button>
                )}
            </div>

            {/* Рендерим подсказки только если инпут активен */}
            {isFocused && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-[2.5rem] shadow-2xl z-50 overflow-hidden p-2">
                    <div className="max-h-[250px] overflow-y-auto space-y-1">
                        {suggestions.map((item, i) => (
                            <button
                                key={i}
                                type="button"
                                onClick={() => handleItemClick(item)}
                                className="w-full flex items-center gap-4 p-4 hover:bg-slate-900 rounded-2xl transition-all text-left group"
                            >
                                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-white/10">
                                    <MapPin className="w-4 h-4 text-slate-400 group-hover:text-blue-400" />
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="font-black uppercase italic text-sm tracking-tighter text-slate-900 group-hover:text-white truncate">
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
