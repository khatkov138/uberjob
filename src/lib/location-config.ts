// src/lib/location-config.ts

export const DEFAULT_LOCATION = {
  city: "Москва",
  slug: "moskva", // Добавляем слаг для дефолтной навигации
  lat: 55.755819,
  lng: 37.617644,
  radius: 100,
  yandexUri: "ymapsbm1://geo?data=Cgg1MzE2NjM5MxIa0KDQvtGB0YHQuNGPLCDQnNC-0YHQutCy0LA,"
}
// Функция для нормализации координат (4 знака = точность ~11 метров)
export const roundCoord = (n: number | string | undefined | null): number => {
  const num = parseFloat(String(n))
  if (isNaN(num)) return 0
  // Умножаем на 10000, округляем до целого и делим обратно
  // Это гарантирует одинаковый результат везде
  return Math.round(num * 10000) / 10000
}
