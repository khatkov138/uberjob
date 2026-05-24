import { createApiResponse } from "@/lib/server-utils";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  return createApiResponse(async () => {
    const { searchParams } = new URL(request.url);
    const queryText = searchParams.get("text");
    const latStr = searchParams.get("lat");
    const lngStr = searchParams.get("lng");

    const lat = latStr ? parseFloat(latStr) : null;
    const lng = lngStr ? parseFloat(lngStr) : null;

    // =========================================================================
    // 🔥 РЕЖИМ 3: ОБРАТНОЕ ГЕОКОДИРОВАНИЕ (Только координаты, без текста)
    // Твой полностью оригинальный и рабочий код
    // =========================================================================
    if (lat && lng && !queryText) {
      const geoCoderParams = new URLSearchParams({
        apikey: process.env.YANDEX_GEOCODE_KEY || "",
        geocode: `${lng},${lat}`, // Порядок Яндекса: [долгота, широта]
        lang: "ru_RU",
        format: "json",
        results: "1",
        kind: "house"
      });
      console.log('test3')
      const response = await fetch(`${process.env.YANDEX_GEOCODE_URI}?${geoCoderParams.toString()}`);
      if (!response.ok) throw new Error("Yandex Geocoder API error");

      const data = await response.json();
      console.log(data)
      
      // Твой рабочий парсинг массива с индексом [0]
      const geoObject = data.response?.GeoObjectCollection?.featureMember?.[0]?.GeoObject;

      if (!geoObject) return { address: "" };

      const addressComponents = geoObject.metaDataProperty?.GeocoderMetaData?.Address?.Components;

      const streetComponent = addressComponents?.find((c: any) => c.kind === "street");
      const houseComponent = addressComponents?.find((c: any) => c.kind === "house");

      const street = streetComponent?.name || "";
      const house = houseComponent?.name || "";

      const cleanAddress = street
        ? `${street}${house ? `, ${house}` : ''}`
        : (geoObject.name || "Точный адрес не найден");

      return { address: cleanAddress };
    }

    // Защита для текстовых режимов
    if (!queryText) return [];

    // =========================================================================
    // 🔥 РЕЖИМ 2: ПОИСК ВНУТРИ ВЫБРАННОГО ГОРОДА (Текст + Координаты)
    // Фикс Бишкека: перевели на нативный bbox + strict_bounds для Suggest API v1
    // =========================================================================
    if (lat && lng && queryText) {
      // Честно считаем рамку 50х50 км вокруг города, чтобы зажать Suggest API v1
      const latDegreeKm = 111.132;
      const lngDegreeKm = 111.320 * Math.cos((lat * Math.PI) / 180);
      
      const latDelta = 25 / latDegreeKm;
      const lngDelta = 25 / lngDegreeKm;

      const minLat = lat - latDelta;
      const maxLat = lat + latDelta;
      const minLng = lng - lngDelta;
      const maxLng = lng + lngDelta;

      const params = new URLSearchParams({
        apikey: process.env.YANDEX_MAPS_KEY || "",
        text: queryText,
        lang: "ru_RU",
        results: "7",
        print_address: "1",
        attrs: "uri",
        // Передаем границы вместо старых ll/spn
        bbox: `${minLng},${minLat},${maxLng},${maxLat}`,
        strict_bounds: "1" // Бетонный рубильник Яндекса от ложных городов!
      });

      const response = await fetch(`${process.env.YANDEX_SUGGEST_URI}?${params.toString()}`);
      if (!response.ok) throw new Error("Yandex Suggest API error (Bounded)");

      const data = await response.json();
      return data.results || [];
    }

    // =========================================================================
    // 🔥 РЕЖИМ 1: ПОИСК ТОЛЬКО НАСЕЛЕННЫХ ПУНКТОВ (Только текст)
    // =========================================================================
    const params = new URLSearchParams({
      apikey: process.env.YANDEX_MAPS_KEY || "",
      text: queryText,
      lang: "ru_RU",
      results: "7",
      types: "locality",
      print_address: "1",
      attrs: "uri"
    });

    const response = await fetch(`${process.env.YANDEX_SUGGEST_URI}?${params.toString()}`);
    if (!response.ok) throw new Error("Yandex Suggest API error (Global)");

    const data = await response.json();
    return data.results || [];
  });
}
