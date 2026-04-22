// app/(client)/layout.tsx
import { getServerSession } from "@/lib/get-session"
import { unauthorized } from "next/navigation"

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession()

  // Если нет сессии — никто не пройдет дальше лейаута
  if (!session?.user) {
    unauthorized()
  }

  return <>{children}</>
}
