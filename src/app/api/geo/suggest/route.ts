import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const urlParams = new URL(request.url);
  const queryText = urlParams.searchParams.get("text");

  if (!queryText) return NextResponse.json([]);

  // Собираем ссылку через конкатенацию (+)
  const baseUrl = "https://suggest-maps.yandex.ru/v1/suggest";
  const apiKey = "deeac62a-74fc-4898-8461-8909eda27a9b";
  
  const finalUrl = baseUrl 
    + "?apikey=" + apiKey 
    + "&text=" + encodeURIComponent(queryText) 
    + "&lang=ru_RU" 
    + "&results=7" 
    + "&types=locality" 
    + "&print_address=1"
    +"&attrs=uri"

  try {
    const response = await fetch(finalUrl);
    const data = await response.json();
    
    // Возвращаем массив подсказок
    return NextResponse.json(data.results || []);
  } catch (error) {
    return NextResponse.json({ error: "API Error" }, { status: 500 });
  }
}