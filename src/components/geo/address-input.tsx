"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
import { MapPin, Loader2, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface AddressInputProps {
  onSelect: (data: { address: string; lat: number; lng: number }) => void
  defaultValue?: string
}

export function AddressInput({ onSelect, defaultValue = "" }: AddressInputProps) {
  const [query, setQuery] = React.useState(defaultValue)
  const [suggestions, setSuggestions] = React.useState<any[]>([])
  const [isOpen, setIsOpen] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)

  const handleSearch = async (val: string) => {
    setQuery(val)
    if (val.length < 3) return setSuggestions([])

    setIsLoading(true)
    try {
      // Используем твой серверный роут
      const res = await fetch("/api/geo/suggest?text=" + encodeURIComponent(val))
      const data = await res.json()
      setSuggestions(data)
      setIsOpen(true)
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelect = async (item: any) => {
    const cityName = item.title.text
    const fullAddress = item.subtitle?.text ? `${item.subtitle.text}, ${cityName}` : cityName
    
    setQuery(fullAddress)
    setIsOpen(false)
    setIsLoading(true)

    try {
      // Получаем координаты по URI через твой серверный геокодер
      const res = await fetch("/api/geo/geocode?uri=" + encodeURIComponent(item.uri))
      const coords = await res.json()

      onSelect({
        address: fullAddress,
        lat: coords.lat,
        lng: coords.lng
      })
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative w-full">
      <div className="relative">
        <Input
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Введите название..."
          className="h-12 rounded-2xl pr-10 border-2 focus-visible:ring-blue-600"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
        </div>
      </div>

      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 w-full bg-white border-2 rounded-2xl mt-2 shadow-2xl overflow-hidden max-h-60 overflow-y-auto">
          {suggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSelect(s)}
              className="w-full p-4 text-left hover:bg-blue-50 flex flex-col border-b last:border-0 transition-colors"
            >
              <span className="font-bold text-sm">{s.title.text}</span>
              <span className="text-[10px] text-muted-foreground uppercase font-bold">{s.subtitle?.text}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
