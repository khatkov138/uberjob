import { cache } from "react"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { UserRole } from "../../prisma/generated"

// По умолчанию "SERVER" - это и страницы, и экшены. Они делят один кэш.
export const getServerSession = cache(async (source: "SERVER" | "API" = "SERVER") => {
  try {
    const h = await headers()
    
    // По источнику сразу поймешь: пришло из роута /api или из недр рендеринга
    const label = source === "API" ? "  [API-ROUTE]  " : "[SERVER-RENDER]"
    console.log(`------------------ ${label} REAL SESSION REQUEST ------------------`)

    const sessionData = await auth.api.getSession({
      headers: h,
    })

    if (!sessionData || !sessionData.user) return null

    return {
      ...sessionData,
      user: {
        ...sessionData.user,
        role: (sessionData.user.role as UserRole) || UserRole.USER,
      },
    }
  } catch (error) {
    console.error(`[${source}] SESSION_ERROR:`, error)
    return null
  }
})
