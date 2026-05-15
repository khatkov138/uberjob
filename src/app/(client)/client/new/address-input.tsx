"use client"

import * as React from "react"
import { Search, MapPin, Loader2, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { handleApi, cn } from "@/lib/utils"
import { useDebounce } from "@/hooks/use-debounce"

interface YandexSuggestItem {
    title: { text: string }
    subtitle?: { text: string }
    uri: string
}

interface AddressInputProps {
    defaultValue?: string
    onSelect: (item: YandexSuggestItem) => void
    placeholder?: string
}

export function AddressInput({ defaultValue, onSelect, placeholder }: AddressInputProps) {
    const [query, setQuery] = React.useState(defaultValue || "")
    const [suggestions, setSuggestions] = React.useState<YandexSuggestItem[]>([])
    const [isLoading, setIsLoading] = React.useState(false)

    // 🔒 ФИКСИРУЕМ СТАРТОВОЕ СОСТОЯНИЕ ДЛЯ БЛОКИРОВКИ ПЕРВОГО ХОЛОСТОГО ЗАПРОСА
    const isFirstRenderWithDefault = React.useRef(!!defaultValue)

    // Используем дебаунс (300мс), чтобы не вешать API
    const debouncedQuery = useDebounce(query, 300)

    // Эффект на поиск
    React.useEffect(() => {
        // 🛡️ ЗАТВОР: если это первый проход гидратации/монтирования и текст совпадает с дефолтом — гасим запрос
        if (isFirstRenderWithDefault.current && debouncedQuery === defaultValue) {
            isFirstRenderWithDefault.current = false // Сбрасываем затвор, следующие изменения пойдут в сеть
            return
        }

        const fetchSuggestions = async () => {
            if (debouncedQuery.length < 3) {
                setSuggestions([])
                return
            }

            setIsLoading(true)
            try {
                const data = await handleApi<YandexSuggestItem[]>(
                    fetch(`/api/geo/suggest?text=${encodeURIComponent(debouncedQuery)}`)
                )
                setSuggestions(data || [])
            } catch (err) {
                console.error("ZWORK_SUGGEST_ERROR:", err)
            } finally {
                setIsLoading(false)
            }
        }

        fetchSuggestions()
    }, [debouncedQuery, defaultValue]) // Добавили defaultValue в зависимости для честной работы контракта React

    const handleItemClick = (item: YandexSuggestItem) => {
        isFirstRenderWithDefault.current = false // Любой клик окончательно деактивирует затвор
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
                        isFirstRenderWithDefault.current = false // Пользователь начал стирать/писать — затвор снимается
                        setQuery(e.target.value)
                    }}
                    placeholder={placeholder || "Введите город или адрес..."}
                    className="h-16 pl-14 pr-12 rounded-2xl border-2 border-slate-100 bg-slate-50/50 focus:bg-white focus:border-blue-600 font-black italic text-lg uppercase tracking-tighter transition-all outline-none shadow-inner"
                />

                {query && (
                    <button
                        type="button"
                        onClick={() => { 
                            isFirstRenderWithDefault.current = false; 
                            setQuery(""); 
                            setSuggestions([]); 
                        }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 hover:bg-slate-100 rounded-full transition-colors z-10"
                    >
                        {isLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                        ) : (
                            <X className="w-4 h-4 text-slate-400" />
                        )}
                    </button>
                )}
            </div>

            {/* ВЫПАДАЮЩИЙ СПИСОК */}
            {suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-[2.5rem] shadow-2xl z-[100] overflow-hidden p-2 animate-in fade-in zoom-in-95 duration-200">
                    <div className="max-h-[300px] overflow-y-auto custom-scrollbar space-y-1">
                        {suggestions.map((item, i) => (
                            <button
                                key={i}
                                type="button"
                                onClick={() => handleItemClick(item)}
                                className="w-full flex items-center gap-4 p-4 hover:bg-slate-900 rounded-2xl transition-all text-left group"
                            >
                                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-white/10 transition-all">
                                    <MapPin className="w-4 h-4 text-slate-400 group-hover:text-blue-400 transition-colors" />
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="font-black uppercase italic text-sm tracking-tighter text-slate-900 group-hover:text-white leading-none mb-1 truncate">
                                        {item.title.text}
                                    </span>
                                    {item.subtitle?.text && (
                                        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 group-hover:text-slate-500 truncate">
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
