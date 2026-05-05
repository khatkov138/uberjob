// src/actions/location/manage.ts
"use server"

import prisma from "@/lib/prisma"
import { createAction } from "@/lib/server-utils"
import { slugify } from "@/lib/utils"


export async function getOrCreateLocation(uri: string) {
    return createAction(async () => {
        // 1. Поиск в базе (единственный источник истины — URI)
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

        // Достаем координаты
        const [lng, lat] = geoObject.Point.pos.split(" ").map(Number);

        // Достаем нормальное название (например, "Ангарск" вместо того, что ввел юзер)
        const officialName = geoObject.name;

        // 3. Создаем запись с автоматическим слагом
        const slug = slugify(officialName);

        return await prisma.location.create({
            data: {
                name: officialName,
                yandexUri: uri,
                slug: `${slug}-${Math.random().toString(36).substring(2, 5)}`, // Короткий хвост для уникальности
                lat,
                lng
            }
        });
    });
}
