// src/actions/location/manage.ts
"use server"

import prisma from "@/lib/prisma"
import { createAction } from "@/lib/server-utils"
import { slugify } from "@/lib/utils"


export async function getOrCreateLocation(uri: string, name: string) {
    return createAction(async () => {
        // 1. Сначала ищем в своей базе, чтобы сэкономить лимиты Яндекса
        const existing = await prisma.location.findUnique({
            where: { yandexUri: uri }
        })

        if (existing) return existing

        // 2. Если в базе нет — идем к Яндексу (копируем логику твоего роута)
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

        // 3. Создаем запись в нашей БД
        const slug = slugify(name)

        // Проверка на дубликат слага (на всякий случай)
        const slugExists = await prisma.location.findUnique({ where: { slug } })
        const finalSlug = slugExists ? `${slug}-${Date.now().toString().slice(-4)}` : slug

        return await prisma.location.create({
            data: {
                name,
                yandexUri: uri,
                slug: finalSlug,
                lat,
                lng
            }
        })
    })
}
