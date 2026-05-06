import { Metadata } from "next"
import { redirect } from "next/navigation"
import prisma from "@/lib/prisma"

// Libs & Actions
import { getServerSession } from "@/lib/get-session"
import { unwrap } from "@/lib/utils"
import { getOrders } from "@/actions/order/get"
import { getMyProfile } from "@/actions/profile/get"
import { getPopularCategories } from "@/actions/category/get"

// Серверная логика
import { getServerLocation, getServerOrdersState } from "@/lib/server-utils"
import { LOCATION_CONFIG } from "@/lib/location-config"

import OrdersPageUI from "./OrdersPageUI"

// Обновленный интерфейс контекста
export interface FeedContext {
  locationId: string;
  lat: number;
  lng: number;
  radius: number;
  name: string;
  slug: string;
  categoryId: string | null;
  skillIds: string[]; // Добавили для синхронизации с SSR
}

interface Props {
  params: Promise<{ slug?: string[] }>
}

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
      description: `${dbCategory.name} в городе ${cityName}.`
    };
  }
  return { title: `Работа и заказы — ${cityName}` };
}

export default async function OrdersPage({ params }: Props) {
  const { slug = [] } = await params;
  const [citySlug, categorySlug] = slug;

  const session = await getServerSession();

  // 1. Параллельно получаем Гео и Настройки (Радиус) из кук
  const [currentGeo, ordersView] = await Promise.all([
    getServerLocation(),
    getServerOrdersState()
  ]);

  // 2. РЕДИРЕКТ /orders -> /orders/city
  if (!citySlug) {
    return redirect(`/orders/${currentGeo.slug}`);
  }

  // 3. ПОИСК ЛОКАЦИИ И КАТЕГОРИИ
  const dbLocation = await prisma.location.findUnique({ where: { slug: citySlug } });
  
  if (!dbLocation) {
    const fuzzy = await prisma.location.findFirst({
      where: { slug: { startsWith: citySlug, mode: 'insensitive' } }
    });
    return redirect(`/orders/${fuzzy?.slug || currentGeo.slug}${categorySlug ? `/${categorySlug}` : ''}`);
  }

  let currentCategory = null;
  if (categorySlug) {
    currentCategory = await prisma.category.findUnique({
      where: { slug: categorySlug },
      select: { id: true, name: true, slug: true }
    });
    if (!currentCategory) return redirect(`/orders/${citySlug}`);
  }

  // 4. Сначала получаем Профиль, чтобы достать скиллы для FeedContext
  const profileRes = await getMyProfile();
  const initialProfile = unwrap(profileRes, null);
  const skillIds = initialProfile?.skills.map(s => s.categoryId) || [];

  // 5. СБОРКА ПОЛНОГО КОНТЕКСТА
  const feedContext: FeedContext = {
    locationId: dbLocation.id,
    name: dbLocation.name,
    slug: dbLocation.slug,
    lat: dbLocation.lat,
    lng: dbLocation.lng,
    radius: ordersView.radius,
    categoryId: currentCategory?.id || null,
    skillIds: skillIds // Передаем на клиент для сравнения в useMemo
  };

  // 6. ФЕТЧ ДАННЫХ (Экшен getOrders теперь получит skillIds из контекста)
  const [ordersRes, popularRes] = await Promise.all([
    getOrders({ ...feedContext, limit: 20 }),
    getPopularCategories(feedContext.lat, feedContext.lng, feedContext.radius)
  ]);

  return (
    <OrdersPageUI
      session={session}
      initialOrders={unwrap(ordersRes, [])}
      initialProfile={initialProfile}
      feedContext={feedContext}
      popularCategories={unwrap(popularRes, [])}
      currentCategory={currentCategory}
    />
  );
}
