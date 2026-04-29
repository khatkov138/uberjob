import { createApiResponse } from "@/lib/server-utils";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  return createApiResponse(async () => {
    const { searchParams } = new URL(request.url);
    const queryText = searchParams.get("text");

    if (!queryText) return [];

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
    if (!response.ok) throw new Error("Yandex Suggest API error");
    
    const data = await response.json();
    return data.results || [];
  });
}
