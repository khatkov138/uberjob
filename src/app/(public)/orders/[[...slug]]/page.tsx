// src/app/orders/[[...slug]]/page.tsx
import { Metadata } from "next";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";

import { unwrap } from "@/lib/utils"; // 🎯 Убрали лишний импорт getServerSession

import { getMyProfile } from "@/actions/profile/get";
import { getPopularCategories } from "@/actions/category/get";

import { getServerFeedState, getServerLocation } from "@/lib/server-utils";
import OrdersPageUI from "./OrdersPageUI";
import { getOrders } from "@/actions/order/get-feed";

import { FeedController } from "./_components/providers/FeedController";

export interface FeedContext {
  locationId: string;
  lat: number;
  lng: number;
  radius: number;
  name: string;
  slug: string;
  categoryId: string | null;
  skillIds: string; 
  viewMode: 'list' | 'map';
}

interface Props {
  params: Promise<{ slug?: string[] }>;
}

export default async function OrdersPage({ params }: Props) {
  const { slug = [] } = await params;
  const [citySlug, categorySlug] = slug;

  // 1. Быстрые данные из кук и локация (Параллельный неблокирующий сбор)
  const [currentGeo, feedState] = await Promise.all([
    getServerLocation(),
    getServerFeedState()
  ]);

  if (!citySlug) return redirect(`/orders/${currentGeo.slug}`);

  // 2. БД Данные (Параллельный неблокирующий сбор)
  const [dbLocation, currentCategory] = await Promise.all([
    prisma.location.findUnique({ where: { slug: citySlug } }),
    categorySlug
      ? prisma.category.findUnique({
        where: { slug: categorySlug },
        select: { id: true, name: true, slug: true }
      })
      : null
  ]);

  if (!dbLocation) return redirect(`/orders/${currentGeo.slug}`);
  if (categorySlug && !currentCategory) return redirect(`/orders/${citySlug}`);

  // 3. Профиль пользователя (Единая точка проверки сессии и сбора скиллов)
  const profileRes = await getMyProfile();
  const initialProfile = unwrap(profileRes, null);
  const skillIds = initialProfile?.skills.map(s => s.categoryId) || [];

  // Наш чистый стартовый контекст
  const initialFeedContext: FeedContext = {
    locationId: dbLocation.id,
    name: dbLocation.name,
    slug: dbLocation.slug,
    lat: dbLocation.lat,
    lng: dbLocation.lng,
    radius: feedState.radius,
    categoryId: currentCategory?.id || null,
    skillIds: skillIds.sort().join(','),
    viewMode: feedState.viewMode
  };

  // 4. Тяжелые промисы (Стриминг)
  const ordersPromise = (async () => {
    return getOrders({ ...initialFeedContext, mode: feedState.viewMode });
  })();

  const popularCategoriesPromise = getPopularCategories(
    initialFeedContext.lat,
    initialFeedContext.lng,
    initialFeedContext.radius
  );

  return (
    <FeedController
      ordersPromise={ordersPromise}
      initialProfile={initialProfile} // 🔌 Пробрасываем только профиль, сессия стерта намертво
      initialFeedContext={initialFeedContext}
      currentCategory={currentCategory}
    >
      <OrdersPageUI popularCategoriesPromise={popularCategoriesPromise} />
    </FeedController>
  );
}
