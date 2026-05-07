// src/actions/location/manage.ts
"use server"

import prisma from "@/lib/prisma"
import { createAction } from "@/lib/server-utils"
import { slugify } from "@/lib/utils"


export async function getOrCreateLocation(uri: string) {
    return createAction(async () => {
        // 1. Поиск в базе
        const existing = await prisma.location.findUnique({
            where: { yandexUri: uri }
        })
        if (existing) return existing

        // 2. Запрос к Яндексу
        const params = new URLSearchParams({
            apikey: process.env.YANDEX_GEOCODE_KEY || "",
            format: "json",
            uri: uri,
            results: "1"
        });

        const response = await fetch(`${process.env.YANDEX_GEOCODE_URI}?${params.toString()}`);
        if (!response.ok) throw new Error("Yandex API Error");

        const data = await response.json();
        const geoObject = data.response?.GeoObjectCollection?.featureMember?.[0]?.GeoObject;

        if (!geoObject) throw new Error("Локация не найдена");

        const [lng, lat] = geoObject.Point.pos.split(" ").map(Number);
        const officialName = geoObject.name;

        // 3. Генерация слага (проверяем занятость только если нужно)
        const baseSlug = slugify(officialName);

        const isSlugTaken = await prisma.location.findUnique({
            where: { slug: baseSlug }
        });

        // Если слаг занят, только тогда клеим хвост
        const finalSlug = isSlugTaken
            ? `${baseSlug}-${Math.random().toString(36).substring(2, 5)}`
            : baseSlug;

        // 4. Создание записи
        return await prisma.location.create({
            data: {
                name: officialName,
                yandexUri: uri,
                slug: finalSlug,
                lat,
                lng
            }
        });
    });
}