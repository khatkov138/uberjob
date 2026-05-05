// app/orders/[[...slug]]/page.tsx
import { Metadata } from "next"
import { redirect } from "next/navigation"
import prisma from "@/lib/prisma"

// Libs & Actions
import { getServerSession } from "@/lib/get-session"
import { unwrap } from "@/lib/utils"
import { getOrders } from "@/actions/order/get"
import { getMyProfile } from "@/actions/profile/get"
import { getPopularCategories } from "@/actions/category/get"

// Наша новая серверная логика
import { getServerLocation, getServerOrdersView } from "@/lib/server-utils"
import { LOCATION_CONFIG } from "@/lib/location-config"
import OrdersPageClient from "./OrdersPageClient"


export interface FeedContext {
  id: string;
  lat: number;
  lng: number;
  radius: number;
  name: string;
  slug: string;
  categoryId: string | null;
}

interface Props {
  params: Promise<{ slug?: string[] }>
}

/**
 * SEO МЕТАДАННЫЕ
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug = [] } = await params;
  const [citySlug, categorySlug] = slug;

  if (!citySlug) return {};

  const [dbLocation, dbCategory] = await Promise.all([
    prisma.location.findUnique({ where: { slug: citySlug } }),
    categorySlug ? prisma.category.findUnique({ where: { slug: categorySlug } }) : null
  ]);

  const cityName = dbLocation?.name || LOCATION_CONFIG.DEFAULT.city;

  if (dbCategory) {
    return {
      title: `${dbCategory.name} — ${cityName}`,
      description: `${dbCategory.name} в городе ${cityName}. Найдите исполнителя на ZWORK.`
    };
  }

  return {
    title: `Работа и заказы — ${cityName}`,
  };
}

/**
 * SERVER COMPONENT
 */
export default async function OrdersPage({ params }: Props) {
  const { slug = [] } = await params;
  const [citySlug, categorySlug] = slug;

  const session = await getServerSession();

  // 1. Получаем данные параллельно: Чистая локация и Настройки отображения
  const [currentGeo, ordersView] = await Promise.all([
    getServerLocation(),
    getServerOrdersView()
  ]);

  // 2. РЕДИРЕКТ С КОРНЯ /orders -> на город из стора (кук)
  if (!citySlug) {
    return redirect(`/orders/${currentGeo.slug}`);
  }

  // 3. ПОИСК ЛОКАЦИИ ПО СЛАГУ ИЗ URL (Приоритет URL над куками)
  let dbLocation = await prisma.location.findUnique({
    where: { slug: citySlug }
  });

  // 4. ФОЛБЭК: Если слаг "битый", пробуем мягкий поиск или кидаем на город из стора
  if (!dbLocation) {
    const fuzzy = await prisma.location.findFirst({
      where: { slug: { startsWith: citySlug, mode: 'insensitive' } }
    });
    const targetSlug = fuzzy?.slug || currentGeo.slug;
    return redirect(`/orders/${targetSlug}${categorySlug ? `/${categorySlug}` : ''}`);
  }

  // 5. ПОИСК КАТЕГОРИИ
  let currentCategory = null;
  if (categorySlug) {
    currentCategory = await prisma.category.findUnique({
      where: { slug: categorySlug },
      select: { id: true, name: true, slug: true }
    });
    if (!currentCategory) return redirect(`/orders/${citySlug}`);
  }

  // 6. СБОРКА ЕДИНОГО КОНТЕКСТА feedContext
  // Гео берем из URL (dbLocation), а настройки фильтров — из кук (ordersView)
  const feedContext: FeedContext = {
    id: dbLocation.id,
    name: dbLocation.name,
    slug: dbLocation.slug,
    lat: dbLocation.lat,
    lng: dbLocation.lng,
    radius: ordersView.radius,
    // ВАЖНО: используй || null, чтобы убрать undefined
    categoryId: currentCategory?.id || null
  };

  // 7. ПАРАЛЛЕЛЬНЫЙ FETCH ДАННЫХ
  const [ordersRes, profileRes, popularRes] = await Promise.all([
    // Передаем контекст. Благодаря деструктуризации в экшене, 
    // limit подставится автоматически (15), если мы его здесь не укажем.
    getOrders({ ...feedContext, limit: 20 }),
    getMyProfile(),
    getPopularCategories(feedContext.lat, feedContext.lng, feedContext.radius)
  ]);

  return (
    <OrdersPageClient
      session={session}
      initialOrders={unwrap(ordersRes, [])}
      initialProfile={unwrap(profileRes, null)}
      feedContext={feedContext}
      popularCategories={unwrap(popularRes, [])}
      currentCategory={currentCategory}
    />
  );
}
