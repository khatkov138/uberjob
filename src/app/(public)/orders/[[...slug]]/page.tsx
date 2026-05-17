import { Metadata } from "next";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";

import { serializeDeterministic, unwrap } from "@/lib/utils";

import { getMyProfile } from "@/actions/profile/get";
import { getPopularCategories } from "@/actions/category/get";

import { getServerFeedState, getServerLocation } from "@/lib/server-utils";
import OrdersPageUI from "./OrdersPageUI";
import { getOrders } from "@/actions/order/get-feed";

import { FeedController } from "./_components/providers/FeedController";

// 🎯 СЕТЕВОЙ СЛОЙ: Кристально чистый плоский контекст для Танстека и API
export interface FeedContext {
  locationId: string;
  lat: number;
  lng: number;
  radius: number;
  skillIds: string;
  viewMode: 'list' | 'map';
  categoryId: string | null;
}

// 🎯 UI СЛОЙ: Неизменяемая статика для рендеринга шапки, SEO и модалок
export interface InitialFeedData {
  cityName: string;
  citySlug: string;
  categoryName: string | null;
  categorySlug: string | null;
  initialFeedContextHash: string; // Затвор для useIsomorphicGate
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

  // 🎯 1-й объект: Чистый плоский контекст для Танстека
  const initialFeedContext: FeedContext = {
    locationId: dbLocation.id,
    lat: dbLocation.lat,
    lng: dbLocation.lng,
    radius: feedState.radius,
    categoryId: currentCategory?.id || null,
    skillIds: skillIds.sort().join(','),
    viewMode: feedState.viewMode
  };

  // 🎯 2-й объект: Текстовая статика для шапки и заголовков
  const initialFeedData: InitialFeedData = {
    cityName: dbLocation.name,
    citySlug: dbLocation.slug,
    categoryName: currentCategory?.name || null,
    categorySlug: currentCategory?.slug || null,
    initialFeedContextHash: serializeDeterministic(initialFeedContext)
  };

  // 4. Тяжелые промисы (Стриминг)
  const ordersPromise = (async () => {
    return getOrders({
      ...initialFeedContext,
      mode: feedState.viewMode
    });
  })();

  const popularCategoriesPromise = getPopularCategories(
    initialFeedContext.lat,
    initialFeedContext.lng,
    initialFeedContext.radius
  );

  return (
    <FeedController
      ordersPromise={ordersPromise}
      initialProfile={initialProfile}
      initialFeedContext={initialFeedContext} // Улетел плоский контекст
      initialFeedData={initialFeedData}       // Улетела статика для UI
    >
      <OrdersPageUI popularCategoriesPromise={popularCategoriesPromise} />
    </FeedController>
  );
}
