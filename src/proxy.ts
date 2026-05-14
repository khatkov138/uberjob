// proxy.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { handleApi } from './lib/utils'
import { LocationValidationResult } from './app/api/location/validate/route'

interface ZustandLocationCookie {
  state?: {
    globalLocationId?: string | null
    lastOrderLocationId?: string | null
    [key: string]: unknown
  }
  version?: number
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const requestHeaders = new Headers(request.headers)

  // 1. ЛОГИКА UI-РЕЖИМОВ (CLIENT / PRO) — ПОЛНЫЙ ПРИОРИТЕТ URL
  const currentMode = request.cookies.get('zwork-mode')?.value || 'CLIENT'
  let targetMode = currentMode

  if (pathname.startsWith('/pro')) {
    targetMode = 'PRO'
  } else if (pathname.startsWith('/client')) {
    targetMode = 'CLIENT'
  }

  // 2. СИНХРОНИЗАЦИЯ JSON-КУКИ ЛОКАЦИИ (Безопасный парсинг Catch-all [[...slug]])
  const pathParts = pathname.split('/').filter(Boolean)
  const isOrdersPage = pathParts[0] === 'orders'

  let shouldUpdateLocationCookie = false
  let newCookieValue = ''

  if (isOrdersPage && pathParts[1]) {
    const urlCitySlug = pathParts[1]
    const rawLocCookie = request.cookies.get('zwork-core-loc')?.value

    let currentGlobalLocationId: string | null = null
    let parsedCookieState: ZustandLocationCookie = { state: { globalLocationId: null, lastOrderLocationId: null }, version: 0 }

    if (rawLocCookie) {
      try {
        const decoded = decodeURIComponent(rawLocCookie)
        parsedCookieState = JSON.parse(decoded) as ZustandLocationCookie
        currentGlobalLocationId = parsedCookieState?.state?.globalLocationId || null
      } catch (e) {
        console.error("❌ [PROXY] Cookie parse error:", e)
      }
    }

    try {
      const origin = request.nextUrl.origin

      // Используем handleApi для извлечения строго типизированных данных LocationValidationResult
      const validationData = await handleApi<LocationValidationResult>(
        fetch(`${origin}/api/location/validate?slug=${urlCitySlug}`)
      )

      // handleApi гарантирует, что сюда дойдут только успешные данные (json.success === true)
      if (validationData.valid && validationData.id) {
        const fetchedCityId = validationData.id

        if (fetchedCityId !== currentGlobalLocationId) {
          shouldUpdateLocationCookie = true

          if (!parsedCookieState.state) {
            parsedCookieState.state = {}
          }
          parsedCookieState.state.globalLocationId = fetchedCityId
          newCookieValue = encodeURIComponent(JSON.stringify(parsedCookieState))
        }
      }
    } catch (e) {
      // Сюда попадут как сетевые ошибки fetch, так и ошибки валидации/бэкенда, выброшенные из handleApi
      console.error("❌ [PROXY FETCH / VALIDATION ERROR]:", e instanceof Error ? e.message : e)
    }
  }

  // 3. ОДНОВРЕМЕННАЯ МОДИФИКАЦИЯ ЗАПРОСА И ОТВЕТА
  if (targetMode !== currentMode || shouldUpdateLocationCookie) {
    if (targetMode !== currentMode) {
      request.cookies.set('zwork-mode', targetMode)
    }
    if (shouldUpdateLocationCookie) {
      request.cookies.set('zwork-core-loc', newCookieValue)
    }

    const allCookies = request.cookies.getAll()
    const cookieString = allCookies.map(c => `${c.name}=${c.value}`).join('; ')
    requestHeaders.set('cookie', cookieString)

    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })

    if (targetMode !== currentMode) {
      response.cookies.set('zwork-mode', targetMode, { maxAge: 31536000, path: '/' })
    }
    if (shouldUpdateLocationCookie) {
      response.cookies.set('zwork-core-loc', newCookieValue, { maxAge: 31536000, path: '/' })
    }

    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
