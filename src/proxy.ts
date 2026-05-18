// proxy.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { LOCATION_CONFIG } from '@/lib/location-config'

// 🚀 ОБНОВЛЯЕМ ТИПИЗАЦИЮ: Теперь кука локации хранит строго слаги, как и твой Zustand
interface ZustandLocationCookie {
  state?: {
    globalLocationSlug?: string | null    // 🚀 Сменили ID на Slug
    lastOrderLocationSlug?: string | null  // 🚀 Сменили ID на Slug
    [key: string]: unknown
  }
  version?: number
}

interface ZustandFeedCookie {
  state?: {
    radius?: number
    viewMode?: 'list' | 'map'
    [key: string]: unknown
  }
  version?: number
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const requestHeaders = new Headers(request.headers)
  const searchParams = request.nextUrl.searchParams

  // 1. ЛОГИКА UI-РЕЖИМОВ (CLIENT / PRO) — ПОЛНЫЙ ПРИОРИТЕТ URL
  const currentMode = request.cookies.get('zwork-mode')?.value || 'CLIENT'
  let targetMode = currentMode

  if (pathname.startsWith('/pro')) {
    targetMode = 'PRO'
  } else if (pathname.startsWith('/client')) {
    targetMode = 'CLIENT'
  }

  // 2. СИНХРОНИЗАЦИЯ JSON-КУКИ ЛОКАЦИИ И ПАРАМЕТРОВ ФИДА
  const pathParts = pathname.split('/').filter(Boolean)
  const isOrdersPage = pathParts[0] === 'orders'

  let shouldUpdateLocationCookie = false
  let newLocationCookieValue = ''

  let shouldUpdateFeedCookie = false
  let newFeedCookieValue = ''

  if (isOrdersPage) {
    // 🚀 А) НОВАЯ МОЛНИЕНОСНАЯ ЛОГИКА ВАЛИДАЦИИ ГОРОДА (БЕЗ FETCH!)
    if (pathParts[1]) {
      const urlCitySlug = pathParts[1] // Извлекли слаг из ЧПУ урла (например, "angarsk")
      const rawLocCookie = request.cookies.get('zwork-core-loc')?.value

      let currentGlobalLocationSlug: string | null = null
      let parsedLocState: ZustandLocationCookie = { state: { globalLocationSlug: null, lastOrderLocationSlug: null }, version: 0 }

      if (rawLocCookie) {
        try {
          const decoded = decodeURIComponent(rawLocCookie)
          parsedLocState = JSON.parse(decoded) as ZustandLocationCookie
          currentGlobalLocationSlug = parsedLocState?.state?.globalLocationSlug || null
        } catch (e) {
          console.error("❌ [PROXY] Location Cookie parse error:", e)
        }
      }

      // Если город в URL изменился (юзер перешел на другой город) — 
      // синхронизируем куку локации Zustand прямо в памяти за 0мс!
      if (urlCitySlug !== currentGlobalLocationSlug) {
        shouldUpdateLocationCookie = true
        if (!parsedLocState.state) parsedLocState.state = {}
        
        parsedLocState.state.globalLocationSlug = urlCitySlug // Записали слаг 🚀
        newLocationCookieValue = encodeURIComponent(JSON.stringify(parsedLocState))
      }
    }

    // ⚡ Б) АБСОЛЮТНАЯ СИНХРОНИЗАЦИЯ URL И КУКИ ФИДА
    const urlRadiusStr = searchParams.get('radius')
    const urlViewModeStr = searchParams.get('view')

    const rawFeedCookie = request.cookies.get('zwork-feed-state')?.value
    let parsedFeedState: ZustandFeedCookie = { 
      state: { radius: LOCATION_CONFIG.SETTINGS.radius, viewMode: 'list' }, 
      version: 0 
    }

    if (rawFeedCookie) {
      try {
        const decoded = decodeURIComponent(rawFeedCookie)
        parsedFeedState = JSON.parse(decoded) as ZustandFeedCookie
      } catch (e) {
        console.error("❌ [PROXY] Feed Cookie parse error:", e)
      }
    }

    if (!parsedFeedState.state) parsedFeedState.state = {}

    let finalRadius = parsedFeedState.state.radius || LOCATION_CONFIG.SETTINGS.radius
    let finalViewMode = parsedFeedState.state.viewMode || 'list'
    let urlNeedsCorrection = false

    if (urlRadiusStr) {
      const parsedRadius = parseInt(urlRadiusStr, 10)
      const hasValidRadius = LOCATION_CONFIG.SETTINGS.radiusOptions.some(r => r === parsedRadius)

      if (hasValidRadius) {
        if (finalRadius !== parsedRadius) {
          finalRadius = parsedRadius
          shouldUpdateFeedCookie = true
        }
      } else {
        urlNeedsCorrection = true // Кривой радиус -> на исправление
      }
    } else {
      urlNeedsCorrection = true // Нет радиуса -> на исправление
    }

    if (urlViewModeStr === 'list' || urlViewModeStr === 'map') {
      if (finalViewMode !== urlViewModeStr) {
        finalViewMode = urlViewModeStr
        shouldUpdateFeedCookie = true
      }
    } else {
      urlNeedsCorrection = true // Кривой/отсутствующий view -> на исправление
    }

    // Редирект для исправления адресной строки, если параметры неполные или кривые
    if (urlNeedsCorrection) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.searchParams.set('radius', finalRadius.toString())
      redirectUrl.searchParams.set('view', finalViewMode)
      return NextResponse.redirect(redirectUrl, 302)
    }

    if (shouldUpdateFeedCookie) {
      parsedFeedState.state.radius = finalRadius
      parsedFeedState.state.viewMode = finalViewMode
      newFeedCookieValue = encodeURIComponent(JSON.stringify(parsedFeedState))
    }
  }

  // 3. ОДНОВРЕМЕННАЯ МОДИФИКАЦИЯ ЗАПРОСА И ОТВЕТА
  const hasChanges = targetMode !== currentMode || shouldUpdateLocationCookie || shouldUpdateFeedCookie

  if (hasChanges) {
    if (targetMode !== currentMode) request.cookies.set('zwork-mode', targetMode)
    if (shouldUpdateLocationCookie) request.cookies.set('zwork-core-loc', newLocationCookieValue)
    if (shouldUpdateFeedCookie) request.cookies.set('zwork-feed-state', newFeedCookieValue)

    const allCookies = request.cookies.getAll()
    const cookieString = allCookies.map(c => `${c.name}=${c.value}`).join('; ')
    requestHeaders.set('cookie', cookieString)

    const response = NextResponse.next({ request: { headers: requestHeaders } })

    if (targetMode !== currentMode) {
      response.cookies.set('zwork-mode', targetMode, { maxAge: 31536000, path: '/' })
    }
    if (shouldUpdateLocationCookie) {
      response.cookies.set('zwork-core-loc', newLocationCookieValue, { maxAge: 31536000, path: '/' })
    }
    if (shouldUpdateFeedCookie) {
      response.cookies.set('zwork-feed-state', newFeedCookieValue, { maxAge: 31536000, path: '/' })
    }

    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
