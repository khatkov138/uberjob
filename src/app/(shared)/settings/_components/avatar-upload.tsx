"use client"

import { useState } from "react"
import { useUploadThing } from "@/lib/uploadthing"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2, Camera } from "lucide-react"
import { cn } from "@/lib/utils"

interface AvatarUploadProps {
  initialImage?: string | null
  userName: string
  onUploadComplete: (url: string) => void
}

export function AvatarUpload({ initialImage, userName, onUploadComplete }: AvatarUploadProps) {
  const [previewUrl, setPreviewUrl] = useState(initialImage)

  const { startUpload, isUploading } = useUploadThing("avatarUploader", {
    onClientUploadComplete: (res) => {
      const newUrl = res[0].url
      setPreviewUrl(newUrl)
      onUploadComplete(newUrl)
    },
  })

  // Берем первую букву или первые две, если это одно сплошное слово
  const fallbackText = userName ? userName.slice(0, 2).toUpperCase() : "Z"

  return (
    <div className="flex flex-col items-center gap-4 select-none">
      <div 
        className={cn(
          "relative h-32 w-32 rounded-full border border-slate-100 shadow-2xl shadow-slate-200/50 bg-slate-50 overflow-hidden group transition-transform active:scale-98",
          isUploading ? "cursor-not-allowed" : "cursor-pointer"
        )}
        onClick={() => !isUploading && document.getElementById('avatar-input')?.click()}
      >
        {/* АВАТАР ИЗ ШАБЛОНА ИНТЕРФЕЙСА STRIPE */}
        <Avatar className="h-full w-full rounded-full">
          <AvatarImage src={previewUrl || ""} className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105" />
          <AvatarFallback className="bg-blue-600 text-white text-3xl font-black uppercase tracking-tighter">
            {fallbackText}
          </AvatarFallback>
        </Avatar>

        {/* СТЕЙТ ЗАГРУЗКИ ПОД КАПОТОМ */}
        {isUploading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" strokeWidth={3} />
          </div>
        ) : (
          /* ИНТЕРФЕЙСНЫЙ ОВЕРЛЕЙ ПРИ ХОВЕРЕ */
          <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-center backdrop-blur-[2px]">
            <div className="p-2.5 bg-white/10 rounded-xl border border-white/20 scale-90 group-hover:scale-100 transition-transform duration-300 text-white shadow-xl">
              <Camera className="w-5 h-5" />
            </div>
          </div>
        )}

        <input 
          id="avatar-input"
          type="file" 
          className="hidden" 
          accept="image/*" 
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) startUpload([file])
          }} 
        />
      </div>

      {/* МЯГКАЯ ВЫЛИЗАННАЯ ПОДПИСЬ */}
      <p className={cn(
        "text-[9px] font-black uppercase tracking-[0.2em] transition-colors duration-300",
        isUploading ? "text-blue-600 animate-pulse" : "text-slate-400"
      )}>
        {isUploading ? "Синхронизация с облаком..." : "Нажмите на фото, чтобы изменить"}
      </p>
    </div>
  )
}
