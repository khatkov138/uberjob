"use server"
import { headers } from "next/headers";

export async function getServerLocation() {
  const headerList = await headers();
  
  // Данные от провайдера (Vercel/Cloudflare)
  const city = headerList.get("x-vercel-ip-city") || "Иркутск";
  const lat = headerList.get("x-vercel-ip-latitude") || "52.2895";
  const lng = headerList.get("x-vercel-ip-longitude") || "104.2806";

  return {
    city: decodeURIComponent(city),
    lat: parseFloat(lat),
    lng: parseFloat(lng)
  };
}