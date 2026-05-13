// proxy.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

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

  // Город находится на второй позиции (pathParts[1]), если он передан в URL
  if (isOrdersPage && pathParts[1]) {
    const urlCitySlug = pathParts[1] // Например, 'irkutsk'
    const rawLocCookie = request.cookies.get('zwork-core-loc')?.value

    let currentGlobalLocationId: string | null = null
    let parsedCookieState: any = { state: { globalLocationId: null, lastOrderLocationId: null }, version: 0 }

    // Декодируем и парсим старую куку Zustand, если она существует
    if (rawLocCookie) {
      try {
        const decoded = decodeURIComponent(rawLocCookie)
        parsedCookieState = JSON.parse(decoded)
        currentGlobalLocationId = parsedCookieState?.state?.globalLocationId || null
      } catch (e) {
        console.error("❌ [PROXY] Cookie parse error:", e)
      }
    }

    try {
      const origin = request.nextUrl.origin
      // Делаем сверхбыстрый запрос к нашему внутреннему Node.js API-эндпоинту
      const res = await fetch(`${origin}/api/location/validate?slug=${urlCitySlug}`)
      const data = await res.json()

      // Если город валиден и его ID отличается от текущего в куке — пересобираем стейт стора
      if (data.valid && data.id !== currentGlobalLocationId) {
        shouldUpdateLocationCookie = true

        if (!parsedCookieState.state) {
          parsedCookieState.state = {}
        }
        parsedCookieState.state.globalLocationId = data.id

        // Собираем JSON обратно и кодируем для cookie-стандарта Next.js
        newCookieValue = encodeURIComponent(JSON.stringify(parsedCookieState))
      }
    } catch (e) {
      console.error("❌ [PROXY FETCH ERROR]:", e)
    }
  }

  // 3. ОДНОВРЕМЕННАЯ МОДИФИКАЦИЯ ЗАПРОСА И ОТВЕТА (Если есть изменения кук)
  if (targetMode !== currentMode || shouldUpdateLocationCookie) {

    // Перезаписываем куки внутри летящего ЗАПРОСА к серверным компонентам
    if (targetMode !== currentMode) {
      request.cookies.set('zwork-mode', targetMode)
    }
    if (shouldUpdateLocationCookie) {
      request.cookies.set('zwork-core-loc', newCookieValue)
    }

    // Синхронизируем строку заголовка 'cookie' летящего запроса
    const allCookies = request.cookies.getAll()
    const cookieString = allCookies.map(c => `${c.name}=${c.value}`).join('; ')
    requestHeaders.set('cookie', cookieString)

    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })

    // Записываем куки в ОТВЕТ браузера для физического сохранения на клиенте (maxAge: 365 дней)
    if (targetMode !== currentMode) {
      response.cookies.set('zwork-mode', targetMode, { maxAge: 31536000, path: '/' })
    }
    if (shouldUpdateLocationCookie) {
      response.cookies.set('zwork-core-loc', newCookieValue, { maxAge: 31536000, path: '/' })
    }

    return response
  }

  // Если изменений кук не требуется, просто летим дальше со стандартным ответом
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
