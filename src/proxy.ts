// proxy.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { LOCATION_CONFIG } from '@/lib/location-config'

interface ZustandLocationCookie {
  state?: {
    globalLocationSlug?: string | null
    lastOrderLocationSlug?: string | null
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

  // 1. ЛОГИКА UI-РЕЖИМОВ (CLIENT / PRO)
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

  if (isOrdersPage) {
    // 📍 А) ВАЛИДАЦИЯ ГОРОДА ПО ЧПУ СЛАГАМ (0мс в памяти)
    if (pathParts[1]) {
      const urlCitySlug = pathParts[1]
      const rawLocCookie = request.cookies.get('zwork-core-loc')?.value

      let currentGlobalLocationSlug: string | null = null
      let parsedLocState: ZustandLocationCookie = { state: { globalLocationSlug: null, lastOrderLocationSlug: null }, version: 0 }

      if (rawLocCookie) {
        try {
          const decoded = decodeURIComponent(rawLocCookie)
          parsedLocState = JSON.parse(decoded) as ZustandLocationCookie
          currentGlobalLocationSlug = parsedLocState?.state?.globalLocationSlug || null
        } catch (e) { console.error("❌ [PROXY] Location Cookie parse error:", e) }
      }

      if (urlCitySlug !== currentGlobalLocationSlug) {
        shouldUpdateLocationCookie = true
        if (!parsedLocState.state) parsedLocState.state = {}
        parsedLocState.state.globalLocationSlug = urlCitySlug
        newLocationCookieValue = encodeURIComponent(JSON.stringify(parsedLocState))
      }
    }

    // ⚡ Б) СУПЕР-ВАЛИДАТОР ПАРАМЕТРОВ ФИДА (ЗАЩИТА ОТ ЛЕВАКА 🛡️)
    const urlRadiusStr = searchParams.get('radius')
    const urlViewModeStr = searchParams.get('view')

    // Проверяем валидность того, что вбито в URL
    const parsedRadius = urlRadiusStr ? parseInt(urlRadiusStr, 10) : NaN
    const isRadiusValid = LOCATION_CONFIG.SETTINGS.radiusOptions.some(r => r === parsedRadius)
    const isViewValid = urlViewModeStr === 'list' || urlViewModeStr === 'map'

    // 🚨 ЕСЛИ В УРЛ ЧУШЬ ИЛИ ОН ПУСТОЙ (F5) — КОРРЕКТИРУЕМ РЕДИРЕКТОМ НАМЕРТВО
    if (!isRadiusValid || !isViewValid) {
      const rawFeedCookie = request.cookies.get('zwork-feed-state')?.value
      let parsedFeedState: ZustandFeedCookie = { 
        state: { radius: LOCATION_CONFIG.SETTINGS.radius, viewMode: 'list' }, 
        version: 0 
      }

      if (rawFeedCookie) {
        try {
          parsedFeedState = JSON.parse(decodeURIComponent(rawFeedCookie))
        } catch (e) { console.error("❌ [PROXY] Feed Cookie parse error:", e) }
      }
      if (!parsedFeedState.state) parsedFeedState.state = {}

      // Берем безопасный эталон из куки либо дефолт из твоего конфига
      const fallbackRadius = isRadiusValid ? parsedRadius : (parsedFeedState.state.radius || LOCATION_CONFIG.SETTINGS.radius)
      const fallbackViewMode = isViewValid ? urlViewModeStr : (parsedFeedState.state.viewMode || 'list')

      const redirectUrl = request.nextUrl.clone()
      redirectUrl.searchParams.set('radius', fallbackRadius.toString())
      redirectUrl.searchParams.set('view', fallbackViewMode)

      // Жестко выправляем строку браузера
      return NextResponse.redirect(redirectUrl, 302)
    }

    // 🚀 ЕСЛИ ПАРАМЕТРЫ ИДЕАЛЬНЫЕ (КОГДА ЮЗЕР КЛИКАЕТ В UI):
    // Прокси просто молча пропускает запрос дальше! 
    // Никаких мутаций кук фида на сервере -> 0 лишних ререндеров Next.js.
  }

  // 3. ПРИМЕНЕНИЕ ИЗМЕНЕНИЙ КУК ЛОКАЦИИ (ЕСЛИ СМЕНИЛСЯ ГОРОД)
  if (shouldUpdateLocationCookie || targetMode !== currentMode) {
    if (targetMode !== currentMode) request.cookies.set('zwork-mode', targetMode)
    if (shouldUpdateLocationCookie) request.cookies.set('zwork-core-loc', newLocationCookieValue)

    const allCookies = request.cookies.getAll()
    const cookieString = allCookies.map(c => `${c.name}=${c.value}`).join('; ')
    requestHeaders.set('cookie', cookieString)

    const response = NextResponse.next({ request: { headers: requestHeaders } })

    if (targetMode !== currentMode) response.cookies.set('zwork-mode', targetMode, { maxAge: 31536000, path: '/' })
    if (shouldUpdateLocationCookie) response.cookies.set('zwork-core-loc', newLocationCookieValue, { maxAge: 31536000, path: '/' })

    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
