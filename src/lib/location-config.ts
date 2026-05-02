// src/lib/location-config.ts

export const DEFAULT_LOCATION = {
  city: "Иркутск",
  slug: "irkutsk", // Добавляем слаг для дефолтной навигации
  lat: 52.2895,
  lng: 104.2806,
  radius: 50
}
// Функция для нормализации координат (4 знака = точность ~11 метров)
export const roundCoord = (n: number | string | undefined | null): number => {
  const num = parseFloat(String(n))
  if (isNaN(num)) return 0
  // Умножаем на 10000, округляем до целого и делим обратно
  // Это гарантирует одинаковый результат везде
  return Math.round(num * 10000) / 10000
}
