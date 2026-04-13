"use client"

import { useState } from "react"
import { useUploadThing } from "@/lib/uploadthing"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2, Camera } from "lucide-react"

interface AvatarUploadProps {
  initialImage?: string | null
  userName: string
  onUploadComplete: (url: string) => void // Пропс для передачи URL родителю
}

export function AvatarUpload({ initialImage, userName, onUploadComplete }: AvatarUploadProps) {
  const [previewUrl, setPreviewUrl] = useState(initialImage)

  const { startUpload, isUploading } = useUploadThing("avatarUploader", {
    onClientUploadComplete: (res) => {
      const newUrl = res[0].url
      setPreviewUrl(newUrl)
      onUploadComplete(newUrl) // Передаем URL в React Hook Form родителя
    },
  })

  return (
    <div className="flex flex-col items-center gap-4">
      <div 
        className="relative cursor-pointer group" 
        onClick={() => !isUploading && document.getElementById('avatar-input')?.click()}
      >
        <Avatar className="h-32 w-32 border-4 border-white shadow-xl">
          <AvatarImage src={previewUrl || ""} className="object-cover" />
          <AvatarFallback className="bg-blue-600 text-white text-3xl font-black italic">
            {userName.slice(0, 2).toUpperCase()}
          </AvatarFallback>
          {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full">
              <Loader2 className="w-8 h-8 animate-spin text-white" />
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
            <Camera className="w-8 h-8 text-white" />
          </div>
        </Avatar>
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
      <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
        {isUploading ? "Загрузка в облако..." : "Нажмите на фото, чтобы изменить"}
      </p>
    </div>
  )
}
