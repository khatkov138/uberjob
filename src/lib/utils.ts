import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));


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


/**
 * Генерирует стабильный ID для чата.
 * Для заказов: order-{id}
 * Для лички: direct-{sorted_ids}
 */
export const getChatKey = (orderId?: string | null, userId1?: string, userId2?: string) => {
  if (orderId) return `order-${orderId}`;
  
  if (userId1 && userId2) {
    const sortedIds = [userId1, userId2].sort().join("-");
    return `direct-${sortedIds}`;
  }
  
  return "unknown";
};

/**
 * Генерирует полный массив QueryKey для TanStack Query
 */
export const getMessagesQueryKey = (chatKey: string) => ["messages", chatKey];


