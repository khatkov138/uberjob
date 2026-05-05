import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { ActionResponse } from "./server-utils";
import { FeedContext } from "@/app/(public)/orders/[[...slug]]/OrdersPageClient";


export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function handleAction<T>(promise: Promise<ActionResponse<T>>): Promise<T> {
  const res = await promise;

  if (!res.success) {
    // Если success: false, то кидаем ошибку. Текст ошибки берем из экшена.
    throw new Error(res.error || "Action failed");
  }

  // Возвращаем данные как есть. Если там null — значит так и задумано (например, при удалении).
  return res.data as T;
}
/**
 * Утилита для развертывания ответа экшена в Server Components.
 * Если экшен упал, возвращает fallbackValue (например, пустой массив).
 */

export function unwrap<T>(res: ActionResponse<T>, fallback: T): T {
  // Если успех — отдаем данные, если ошибка — отдаем дефолтное значение
  if (res.success && res.data !== null) {
    return res.data as T;
  }
  return fallback;
}

export async function handleApi<T>(promise: Promise<Response>): Promise<T> {
  const res = await promise;
  const json = await res.json();

  if (!res.ok || !json.success) {
    // Выбрасываем ошибку, которую перехватит catch в компоненте
    throw new Error(json.error || `API Error: ${res.status}`);
  }

  // Возвращаем чистые данные
  return json.data as T;
}


/**
 * Вычисляет расстояние между двумя точками в километрах
 */
export function getDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Радиус Земли в километрах
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 10) / 10; // Округляем до 1 знака после запятой (н-р: 12.5 км)
}

function toRad(value: number): number {
  return (value * Math.PI) / 180;
}


// lib/utils.ts

// lib/utils.ts
export const getContextKey = (orderId?: string | null, userId1?: string, userId2?: string) => {
  if (orderId) return `order_${orderId}`;

  if (userId1 && userId2) {
    const sortedIds = [userId1, userId2].sort().join("_");
    return `direct_${sortedIds}`;
  }

  return "global";
};

// Хелпер для TanStack Query
export const getMessagesQueryKey = (contextKey: string) => ["messages", contextKey];


export function slugify(text: string) {
  const charMap: { [key: string]: string } = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo', 'ж': 'zh',
    'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o',
    'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'h', 'ц': 'ts',
    'ч': 'ch', 'ш': 'sh', 'щ': 'sch', 'ы': 'y', 'э': 'e', 'ю': 'yu', 'я': 'ya',
  };

  return text
    .toLowerCase()
    .split('')
    .map(char => charMap[char] || char)
    .join('')
    .replace(/[^a-z0-9]/g, '-') // заменяем всё лишнее на дефисы
    .replace(/-+/g, '-')        // убираем дубли дефисов
    .replace(/^-|-$/g, '');     // обрезаем по краям
}




