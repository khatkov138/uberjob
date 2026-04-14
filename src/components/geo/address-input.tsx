"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
import { MapPin, Loader2, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface AddressInputProps {
  onSelect: (data: { address: string; lat: number; lng: number }) => void
  onChange?: (val: string) => void // Добавляем этот проп
  defaultValue?: string
  placeholder?: string
}

export function AddressInput({ onSelect, onChange, defaultValue = "", placeholder }: AddressInputProps) {
  const [query, setQuery] = React.useState(defaultValue)
  const [suggestions, setSuggestions] = React.useState<any[]>([])
  const [isOpen, setIsOpen] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)

  // Синхронизация с defaultValue (когда прилетает город по IP)
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
    if (onChange) onChange(val) // Сообщаем родительской форме, что текст изменился (сбросим координаты)

    if (val.length < 3) {
      setSuggestions([])
      setIsOpen(false)
      return
    }

    setIsLoading(true)
    try {

      const res = await fetch("/api/geo/suggest?text=" + encodeURIComponent(val))
      const data = await res.json()
      setSuggestions(data)
      setIsOpen(true)
    } catch (err) {
      console.error("Search error:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelect = async (item: any) => {
    const cityName = item.title.text
    // Используем полное название для красоты
    const fullAddress = item.subtitle?.text ? `${item.subtitle.text}, ${cityName}` : cityName

    setQuery(fullAddress)
    setIsOpen(false)
    setIsLoading(true)

    try {
      const res = await fetch("/api/geo/geocode?uri=" + encodeURIComponent(item.uri))
      const coords = await res.json()

      onSelect({
        address: cityName, // В базе нам достаточно только города
        lat: coords.lat,
        lng: coords.lng
      })
    } catch (err) {
      console.error("Geocode error:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const clearInput = () => {
    setQuery("")
    setSuggestions([])
    if (onChange) onChange("")
  }

 


  return (
    <div className="relative w-full" ref={containerRef}>
      <div className="relative">
        <Input
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder={placeholder || "Введите название..."}
          className="h-14 rounded-2xl pr-10 border-none bg-slate-50 focus-visible:ring-blue-600 shadow-inner font-medium"
          onFocus={() => query.length >= 3 && setIsOpen(true)}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
          ) : query ? (
            <X
              className="w-4 h-4 text-slate-400 cursor-pointer hover:text-slate-600 transition-colors"
              onClick={clearInput}
            />
          ) : (
            <MapPin className="w-4 h-4 text-slate-400" />
          )}
        </div>
      </div>

      {/* Список подсказок */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 w-full bg-white border shadow-2xl rounded-2xl mt-2 overflow-hidden max-h-64 overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
          {suggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSelect(s)}
              className="w-full p-4 text-left hover:bg-blue-50 flex flex-col gap-0.5 border-b last:border-0 transition-colors"
            >
              <span className="font-black text-sm text-slate-900">{s.title.text}</span>
              {s.subtitle?.text && (
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">
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
