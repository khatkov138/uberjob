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
import { DEFAULT_LOCATION } from "@/lib/location-config"

interface Props {
  params: Promise<{ slug?: string[] }>
}

/**
 * SEO МЕТАДАННЫЕ
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug = [] } = await params;
  const [citySlug, categorySlug] = slug;

  if (!citySlug) return { title: "Поиск заказов — ZWORK" };

  const [dbLocation, dbCategory] = await Promise.all([
    prisma.location.findUnique({ where: { slug: citySlug } }),
    categorySlug ? prisma.category.findUnique({ where: { slug: categorySlug } }) : null
  ]);

  const locationName = dbLocation?.name || DEFAULT_LOCATION.city;

  if (dbCategory) {
    return {
      title: `${dbCategory.name} — ${locationName} — ZWORK`,
      description: `Актуальные заказы по направлению ${dbCategory.name} в локации ${locationName}.`
    };
  }

  return {
    title: `Работа и заказы — ${locationName} — ZWORK`,
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

  // 1. РЕДИРЕКТ С КОРНЯ /orders
  if (!citySlug) {
    const targetSlug = locationFromCookies.slug || DEFAULT_LOCATION.slug;
    return redirect(`/orders/${targetSlug}`);
  }

  // 2. ПОИСК ЛОКАЦИИ В БД (Точное совпадение)
  let dbLocation = await prisma.location.findUnique({
    where: { slug: citySlug }
  });

  // --- МЯГКИЙ ПОИСК (FUZZY SEARCH), если точный слаг не найден ---
  if (!dbLocation && citySlug !== DEFAULT_LOCATION.slug) {
    const fuzzyLocation = await prisma.location.findFirst({
      where: {
        slug: {
          startsWith: citySlug, // Поиск по началу строки (например, "irkuts" -> "irkutsk")
          mode: 'insensitive'
        }
      }
    });

    if (fuzzyLocation) {
      // Редиректим на правильный слаг, сохраняя категорию если она была
      const categoryPath = categorySlug ? `/${categorySlug}` : '';
      return redirect(`/orders/${fuzzyLocation.slug}${categoryPath}`);
    }

    // Если даже похожего нет — редирект на дефолт из конфига
    if (citySlug !== DEFAULT_LOCATION.slug) {
      return redirect(`/orders/${DEFAULT_LOCATION.slug}`);
    }
  }

  // 3. ЛОГИКА КАТЕГОРИИ
  let currentCategory = null;
  if (categorySlug) {
    currentCategory = await prisma.category.findUnique({
      where: { slug: categorySlug },
      select: { id: true, name: true, slug: true }
    });
    // Если категория не найдена — сбрасываем до страницы города
    if (!currentCategory) return redirect(`/orders/${citySlug}`);
  }

  // 4. СБОРКА ОБЪЕКТА ФИНАЛЬНОЙ ЛОКАЦИИ
  const finalLocation = {
    city: dbLocation?.name || DEFAULT_LOCATION.city,
    slug: dbLocation?.slug || DEFAULT_LOCATION.slug,
    lat: dbLocation?.lat || DEFAULT_LOCATION.lat,
    lng: dbLocation?.lng || DEFAULT_LOCATION.lng,
    yandexUri: dbLocation?.yandexUri || DEFAULT_LOCATION.yandexUri,
    radius: locationFromCookies.radius, // Радиус всегда берем из кук
    locationId: dbLocation?.id,
    categoryId: currentCategory?.id,
  };

  // 5. ПАРАЛЛЕЛЬНАЯ ЗАГРУЗКА ДАННЫХ
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