// @/app/orders/[[...slug]]/page.tsx

import { Metadata } from "next"
import { redirect } from "next/navigation"
import prisma from "@/lib/prisma"

// Libs & Actions
import { getServerSession } from "@/lib/get-session"
import { unwrap } from "@/lib/utils"
import { getOrders } from "@/actions/order/get"
import { getMyProfile } from "@/actions/profile/get"
import { getServerLocation } from "@/lib/server-utils"
import { getPopularCategories } from "@/actions/category/get"
import OrdersPageClient from "./OrdersPageClient"

// Глобальный дефолт (из твоего конфига/Zustand)
const DEFAULT_LOCATION = {
  city: "Иркутск",
  slug: "irkutsk",
  lat: 52.287,
  lng: 104.281,
  radius: 60
};

interface Props {
  params: Promise<{ slug?: string[] }>
}

/**
 * SEO МЕТАДАННЫЕ
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug = [] } = await params;
  const [citySlug, categorySlug] = slug;

  // 1. Базовый заголовок, если мы на корне /orders
  if (!citySlug) return { title: "Поиск заказов — ZWORK ENGINE" };

  // 2. Ищем локацию и категорию для красивого Title
  const [dbLocation, dbCategory] = await Promise.all([
    prisma.location.findUnique({ where: { slug: citySlug } }),
    categorySlug ? prisma.category.findUnique({ where: { slug: categorySlug } }) : null
  ]);

  const cityName = dbLocation?.name || DEFAULT_LOCATION.city;

  if (dbCategory) {
    return {
      title: `${dbCategory.name} в г. ${cityName} — Заказы на ZWORK`,
      description: `Актуальные предложения по направлению ${dbCategory.name} в ${cityName}.`
    };
  }

  return {
    title: `Работа и заказы в г. ${cityName} — ZWORK ENGINE`,
    description: `Все заказы для мастеров в ${cityName}. Фильтр по радиусу и категориям.`
  };
}

/**
 * СЕРВЕРНЫЙ КОМПОНЕНТ СТРАНИЦЫ
 */
export default async function OrdersPage({ params }: Props) {
  const { slug = [] } = await params;
  const [citySlug, categorySlug] = slug;

  const session = await getServerSession();
  const locationFromCookies = await getServerLocation();

  // --- 1. ЛОГИКА РЕДИРЕКТА НА КОРНЕ (/orders) ---
  if (!citySlug) {
    // Берем слаг из кук или из нашего дефолта
    const targetSlug = locationFromCookies.slug || DEFAULT_LOCATION.slug;
    return redirect(`/orders/${targetSlug}`);
  }

  // --- 2. ПОИСК ЛОКАЦИИ (С фолбэком на виртуалку) ---
  const fetchedLocation = await prisma.location.findUnique({
    where: { slug: citySlug }
  });

  // Если в БД нет, но слаг совпадает с дефолтом — создаем виртуалку. Иначе — на дефолт.
  const dbLocation = fetchedLocation || (citySlug === DEFAULT_LOCATION.slug ? {
    id: "virtual",
    name: DEFAULT_LOCATION.city,
    slug: DEFAULT_LOCATION.slug,
    lat: DEFAULT_LOCATION.lat,
    lng: DEFAULT_LOCATION.lng,
  } : null);

  // Если всё еще null (слаг в URL был левый) — редиректим на дефолт
  if (!dbLocation) {
    return redirect(`/orders/${DEFAULT_LOCATION.slug}`);
  }

  // --- 3. ЛОГИКА КАТЕГОРИИ ---
  let currentCategory = null;
  if (categorySlug) {
    currentCategory = await prisma.category.findUnique({
      where: { slug: categorySlug },
      select: { id: true, name: true, slug: true }
    });
    // Если категория в URL не найдена — чистим URL до города
    if (!currentCategory) return redirect(`/orders/${citySlug}`);
  }

  // --- 4. СБОРКА ОБЪЕКТА ДЛЯ КЛИЕНТА И ЭКШЕНОВ ---
  const finalLocation = {
    city: dbLocation.name,
    slug: dbLocation.slug,
    lat: dbLocation.lat,
    lng: dbLocation.lng,
    radius: locationFromCookies.radius,
    // Если id "virtual", передаем undefined, чтобы SQL искал чисто по радиусу
    locationId: dbLocation.id === "virtual" ? undefined : dbLocation.id,
    categoryId: currentCategory?.id,
  };

  // --- 5. ПАРАЛЛЕЛЬНАЯ ЗАГРУЗКА ---
  const [ordersRes, profileRes, popularRes] = await Promise.all([
    getOrders(finalLocation),
    getMyProfile(),
    getPopularCategories(finalLocation.lat, finalLocation.lng, finalLocation.radius)
  ]);

  return (
    <OrdersPageClient
      session={session}
      initialOrders={unwrap(ordersRes, [])}
      initialProfile={unwrap(profileRes, null)}
      serverLocation={finalLocation}
      popularCategories={unwrap(popularRes, [])}
      currentCategory={currentCategory}
    />
  );
}
