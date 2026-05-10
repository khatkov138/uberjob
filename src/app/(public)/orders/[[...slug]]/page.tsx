import { Metadata } from "next";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";

// Libs & Actions
import { getServerSession } from "@/lib/get-session";
import { unwrap } from "@/lib/utils";

import { getMyProfile } from "@/actions/profile/get";
import { getPopularCategories } from "@/actions/category/get";

// Серверная логика
import { getServerFeedState, getServerLocation } from "@/lib/server-utils";
import OrdersPageUI from "./OrdersPageUI";
import { getOrders } from "@/actions/order/get-feed";

export interface FeedContext {
  locationId: string;
  lat: number;
  lng: number;
  radius: number;
  name: string;
  slug: string;
  categoryId: string | null;
  skillIds: string[];
  viewMode: 'list' | 'map';
}

interface Props {
  params: Promise<{ slug?: string[] }>;
}

export default async function OrdersPage({ params }: Props) {
  const { slug = [] } = await params;
  const [citySlug, categorySlug] = slug;

  const session = await getServerSession();

  // 1. Быстрые данные из кук (оставляем await, это мгновенно)
  const [currentGeo, feedState] = await Promise.all([
    getServerLocation(),
    getServerFeedState()
  ]);

  if (!citySlug) return redirect(`/orders/${currentGeo.slug}`);

  // 2. Поиск локации и категории (БД - тоже быстро, оставляем await)
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

  // 3. Профиль (оставляем await, так как скиллы нужны для формирования контекста)
  const profileRes = await getMyProfile();
  const initialProfile = unwrap(profileRes, null);
  const skillIds = initialProfile?.skills.map(s => s.categoryId) || [];

  const mode = feedState.viewMode;

  const feedContext: FeedContext = {
    locationId: dbLocation.id,
    name: dbLocation.name,
    slug: dbLocation.slug,
    lat: dbLocation.lat,
    lng: dbLocation.lng,
    radius: feedState.radius,
    categoryId: currentCategory?.id || null,
    skillIds,
    viewMode: mode
  };

  // --- ВОТ ТУТ МАГИЯ СТРИМИНГА ---

  // 4. Создаем промисы для тяжелых данных (БЕЗ await)
  // Мы запускаем выполнение, но не ждем результата на сервере.
  const ordersPromise = getOrders({ ...feedContext, mode });

  const popularCategoriesPromise = getPopularCategories(
    feedContext.lat,
    feedContext.lng,
    feedContext.radius
  );

  return (
    // Передаем промисы в OrdersPageUI. 
    // Next.js сразу отдаст HTML страницы, а данные "дотекут" позже.
    <OrdersPageUI
      session={session}
      initialProfile={initialProfile}
      feedContext={feedContext}
      currentCategory={currentCategory}
      // Пробрасываем промисы
      ordersPromise={ordersPromise}
      popularCategoriesPromise={popularCategoriesPromise}
    />
  );
}
