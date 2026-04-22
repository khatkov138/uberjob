import { NextResponse } from "next/server"
import { getServerSession } from "@/lib/get-session"
import prisma from "@/lib/prisma"

export async function GET() {
  // Вызываем с меткой API — в консоли будет порядок
  const session = await getServerSession("API")
  if (!session?.user?.id) return NextResponse.json({ count: 0 })

  const count = await prisma.message.count({
    where: {
      recipientId: session.user.id,
      isRead: false
    }
  })

  return NextResponse.json({ count })
}
