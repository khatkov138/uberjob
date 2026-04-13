import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const uri = searchParams.get("uri");

  if (!uri) return NextResponse.json({ error: "No URI" }, { status: 400 });

  const API_KEY = "91d493f4-aa2a-42dc-8de4-52cb3c872e09";
  
  // Геокодируем по URI — это быстрее и точнее
  const url = "https://geocode-maps.yandex.ru/v1"
    + "?apikey=" + API_KEY
    + "&format=json"
    + "&uri=" + encodeURIComponent(uri)
    + "&results=1";

  try {
    const response = await fetch(url);
    const data = await response.json();
    
    // В ответе Яндекса координаты идут как "long lat"
    const pos = data.response.GeoObjectCollection.featureMember[0].GeoObject.Point.pos;
    const [lng, lat] = pos.split(" ").map(Number);

    return NextResponse.json({ lat, lng });
  } catch (error) {
    return NextResponse.json({ error: "Geocode error" }, { status: 500 });
  }
}
