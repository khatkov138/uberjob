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

import { FeedProvider } from "./_components/layout/FeedProvider";
import { FeedController } from "./_components/layout/FeedController";

export interface FeedContext {
  locationId: string;
  lat: number;
  lng: number;
  radius: number;
  name: string;
  slug: string;
  categoryId: string | null;
  skillIds: string; // 🔥 МЕНЯЕМ НА СТРОКУ
  viewMode: 'list' | 'map';
}

interface Props {
  params: Promise<{ slug?: string[] }>;
}


export default async function OrdersPage({ params }: Props) {
  const { slug = [] } = await params;
  const [citySlug, categorySlug] = slug;

  const session = await getServerSession();

  // 1. Быстрые данные из кук и локация
  const [currentGeo, feedState] = await Promise.all([
    getServerLocation(),
    getServerFeedState()
  ]);

  if (!citySlug) return redirect(`/orders/${currentGeo.slug}`);

  // 2. БД Данные
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

  // 3. Профиль
  const profileRes = await getMyProfile();
  const initialProfile = unwrap(profileRes, null);
  const skillIds = initialProfile?.skills.map(s => s.categoryId) || [];

  // ФОРМИРУЕМ ДАННЫЕ ДЛЯ ИНЪЕКЦИИ В СТОР
  const storeInitialData = {
    viewMode: feedState.viewMode,
    radius: feedState.radius,
  };

  // БАЗОВЫЙ КОНТЕКСТ (Чисто серверный)
  const feedContext: FeedContext = {
    locationId: dbLocation.id,
    name: dbLocation.name,
    slug: dbLocation.slug,
    lat: dbLocation.lat,
    lng: dbLocation.lng,
    radius: feedState.radius,
    categoryId: currentCategory?.id || null,
    skillIds: skillIds.sort().join(','), // 🔥 Сразу склеиваем в стабильную строку на сервере!
    viewMode: feedState.viewMode
  };

  // 4. ТЯЖЕЛЫЕ ПРОМИСЫ (Стриминг)
  const ordersPromise = getOrders({ ...feedContext, mode: feedState.viewMode });
  const popularCategoriesPromise = getPopularCategories(
    feedContext.lat,
    feedContext.lng,
    feedContext.radius
  );

  return (
    <FeedProvider initialData={storeInitialData}>
      <FeedController
        ordersPromise={ordersPromise} // <-- Прямо в контроллер его!
        session={session}
        initialProfile={initialProfile}
        serverContext={feedContext} currentCategory={currentCategory}>
        <OrdersPageUI

          popularCategoriesPromise={popularCategoriesPromise}
        />
      </FeedController>
    </FeedProvider>
  );
}
