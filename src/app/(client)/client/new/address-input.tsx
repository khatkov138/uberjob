"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
import { MapPin, Loader2, X } from "lucide-react"
import { cn, handleApi } from "@/lib/utils" // Используем твой хелпер handleApi

interface AddressInputProps {
  onSelect: (data: { address: string; lat: number; lng: number }) => void
  onChange?: (val: string) => void
  defaultValue?: string
  placeholder?: string
}

export function AddressInput({ onSelect, onChange, defaultValue = "", placeholder }: AddressInputProps) {
  const [query, setQuery] = React.useState(defaultValue)
  const [suggestions, setSuggestions] = React.useState<any[]>([])
  const [isOpen, setIsOpen] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)

  // Синхронизация с внешним значением
  React.useEffect(() => {
    setQuery(defaultValue)
  }, [defaultValue])

  // Закрытие при клике вне компонента
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleInputChange = async (val: string) => {
    setQuery(val)
    if (onChange) onChange(val)

    if (val.length < 3) {
      setSuggestions([])
      setIsOpen(false)
      return
    }

    setIsLoading(true)
    try {
      // handleApi сам вытащит массив из json.data
      const data = await handleApi<any[]>(
        fetch("/api/geo/suggest?text=" + encodeURIComponent(val))
      )
      setSuggestions(data)
      setIsOpen(data.length > 0)
    } catch (err) {
      console.error("ZWORK_SUGGEST_ERROR:", err)
      setSuggestions([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelect = async (item: any) => {
    const cityName = item.title.text
    const subTitle = item.subtitle?.text || ""
    const fullDisplay = subTitle ? `${subTitle}, ${cityName}` : cityName

    setQuery(fullDisplay)
    setIsOpen(false)
    setIsLoading(true)

    try {
      // handleApi вытащит координаты { lat, lng } из json.data
      const coords = await handleApi<{ lat: number; lng: number }>(
        fetch("/api/geo/geocode?uri=" + encodeURIComponent(item.uri))
      )

      onSelect({
        address: fullDisplay,
        lat: coords.lat,
        lng: coords.lng
      })
    } catch (err) {
      console.error("ZWORK_GEOCODE_ERROR:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const clearInput = () => {
    setQuery("")
    setSuggestions([])
    setIsOpen(false)
    if (onChange) onChange("")
    onSelect({ address: "", lat: 0, lng: 0 })
  }

  return (
    <div className="relative w-full" ref={containerRef}>
      <div className="relative group">
        <Input
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder={placeholder || "Где выполнить работу?"}
          className={cn(
            "h-14 rounded-2xl pr-12 border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-blue-600 transition-all font-black italic uppercase text-[11px] tracking-[0.1em]",
            isLoading && "opacity-70"
          )}
          onFocus={() => query.length >= 3 && setIsOpen(true)}
          autoComplete="off"
        />
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
          ) : query ? (
            <button type="button" onClick={clearInput} className="p-1 hover:bg-slate-100 rounded-lg transition-colors">
              <X className="w-4 h-4 text-slate-400 hover:text-red-500" />
            </button>
          ) : (
            <MapPin className="w-4 h-4 text-slate-300" />
          )}
        </div>
      </div>

      {/* СПИСОК ПОДСКАЗОК — NEO-BRUTALISM */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-[100] w-full bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded-[2rem] mt-3 overflow-hidden max-h-72 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
          {suggestions.map((s, i) => (
            <button
              key={i}
              type="button" // Критически важно, чтобы не сабмитило форму
              onClick={() => handleSelect(s)}
              className="w-full p-5 text-left hover:bg-blue-600 hover:text-white flex flex-col gap-1 border-b-2 border-slate-100 last:border-0 transition-all group/item active:bg-blue-700"
            >
              <span className="font-black text-xs uppercase italic tracking-wider leading-none">
                {s.title.text}
              </span>
              {s.subtitle?.text && (
                <span className="text-[9px] font-bold opacity-60 uppercase tracking-tighter group-hover/item:text-white/80">
                  {s.subtitle.text}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
