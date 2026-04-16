import { inferAdditionalFields } from "better-auth/client/plugins"
import { nextCookies } from 'better-auth/next-js'
import { createAuthClient } from 'better-auth/react'
import { auth } from './auth'

export const authClient = createAuthClient({
    plugins: [
        inferAdditionalFields<typeof auth>(),
        nextCookies()
    ]
}) 


export const isAdmin = (role?: string | null) => {
  return role === 'ADMIN' || role === 'SUPERADMIN'
}

export const isSuperAdmin = (role?: string | null) => {
  return role === 'SUPERADMIN'
}