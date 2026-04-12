"use client"

import { useState } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { sendMessage } from "@/app/actions/chat"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Send, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

export function ChatBox({ orderId, currentUserId, initialMessages = [] }: any) {
  const [text, setText] = useState("")

  const mutation = useMutation({
    mutationFn: () => sendMessage({ orderId, text }),
    onSuccess: () => setText("")
  })

  return (
    <div className="flex flex-col h-[400px] border rounded-3xl bg-background overflow-hidden shadow-sm">
      <div className="bg-muted/30 p-4 border-b font-bold text-sm">Чат по заказу</div>
      
      {/* Список сообщений */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {initialMessages.map((msg: any) => (
          <div key={msg.id} className={cn(
            "max-w-[80%] p-3 rounded-2xl text-sm",
            msg.senderId === currentUserId 
              ? "bg-blue-600 text-white ml-auto rounded-tr-none" 
              : "bg-muted text-foreground mr-auto rounded-tl-none"
          )}>
            {msg.text}
          </div>
        ))}
      </div>

      {/* Ввод текста */}
      <form 
        onSubmit={(e) => { e.preventDefault(); if(text) mutation.mutate() }}
        className="p-3 border-t flex gap-2"
      >
        <Input 
          placeholder="Напишите сообщение..." 
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="rounded-xl border-none bg-muted/50"
        />
        <Button size="icon" disabled={mutation.isPending || !text} className="rounded-xl">
          {mutation.isPending ? <Loader2 className="animate-spin w-4 h-4" /> : <Send className="w-4 h-4" />}
        </Button>
      </form>
    </div>
  )
}
