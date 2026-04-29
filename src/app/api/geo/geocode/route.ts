import { createApiResponse, withApiAuth } from "@/lib/server-utils";
import { NextResponse } from "next/server";


export async function GET(request: Request) {
  // Используем withApiAuth, чтобы защитить роут
  return createApiResponse(async () => {
    const { searchParams } = new URL(request.url);
    const uri = searchParams.get("uri");

    if (!uri) throw new Error("No URI provided");

    const params = new URLSearchParams({
      apikey: process.env.YANDEX_GEOCODE_KEY || "",
      format: "json",
      uri: uri,
      results: "1"
    });

    const response = await fetch(`${process.env.YANDEX_GEOCODE_URI}?${params.toString()}`);
    if (!response.ok) throw new Error("Yandex Geocode API error");

    const data = await response.json();
    const feature = data.response?.GeoObjectCollection?.featureMember?.[0];

    if (!feature) throw new Error("Location not found");

    const pos = feature.GeoObject.Point.pos;
    const [lng, lat] = pos.split(" ").map(Number);

    return { lat, lng };
  });
}
