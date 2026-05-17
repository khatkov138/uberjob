import { Metadata } from "next";
import { redirect } from "next/navigation";
import { cache } from "react";
import prisma from "@/lib/prisma";
import { serializeDeterministic, unwrap } from "@/lib/utils";
import { getMyProfile } from "@/actions/profile/get";
import { getPopularCategories } from "@/actions/category/get";
import { getServerFeedState, getServerLocation } from "@/lib/server-utils";
import { getOrders } from "@/actions/order/get-feed";
import OrdersPageUI from "./OrdersPageUI";
import { FeedController } from "./_components/providers/FeedController";

// Контракты данных сохраняются без изменений
export interface FeedContext {
  locationId: string; lat: number; lng: number; radius: number;
  skillIds: string; viewMode: 'list' | 'map'; categoryId: string | null;
}

export interface InitialFeedData {
  cityName: string; citySlug: string; categoryName: string | null;
  categorySlug: string | null; initialFeedContextHash: string;
}

interface Props {
  params: Promise<{ slug?: string[] }>;
}

/**
 * 🎯 СЛОЙ МЕМОИЗАЦИИ: Исключает повторные удары в Postgres.
 * Next.js автоматически дедуплицирует этот вызов между generateMetadata и OrdersPage.
 */
const getCachedRouteData = cache(async (citySlug: string | undefined, categorySlug: string | undefined) => {
  if (!citySlug) return { dbLocation: null, currentCategory: null };

  const [dbLocation, currentCategory] = await Promise.all([
    prisma.location.findUnique({
      where: { slug: citySlug },
      select: { id: true, name: true, slug: true, lat: true, lng: true } // Берем только примитивы
    }),
    categorySlug
      ? prisma.category.findUnique({
        where: { slug: categorySlug },
        select: { id: true, name: true, slug: true }
      })
      : null
  ]);

  return { dbLocation, currentCategory };
});

/**
 * 🚀 ВЫСШИЙ ПИЛОТАЖ SEO: Генерация динамических метатегов под ЧПУ
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug = [] } = await params;
  const [citySlug, categorySlug] = slug;

  if (!citySlug) return {};

  // Достаем данные из кэша текущего запроса за 0мс (база не дергается второй раз)
  const { dbLocation, currentCategory } = await getCachedRouteData(citySlug, categorySlug);
  if (!dbLocation) return {};

  const cityName = dbLocation.name;
  const categoryName = currentCategory?.name ?? "Все заказы и мастера";

  // Формируем жесткие, сочные SEO-анкоры для поисковиков
  const seoTitle = `${categoryName} в г. ${cityName}`;
  const seoDescription = `Актуальные предложения по направлению "${categoryName}" в локации ${cityName}. Проверенные исполнители на ZWORK: интерактивная карта, контакты мастеров, 0% скрытых комиссий.`;

  return {
    title: seoTitle, // Автоматически влетит вместо %s в твой шаблон из root layout
    description: seoDescription,
    // Намертво запечатываем каноническую ссылку от мусора и дублей GET-параметров фида
    alternates: {
      canonical: categorySlug
        ? `/orders/${citySlug}/${categorySlug}`
        : `/orders/${citySlug}`
    }
  };
}

/**
 * 🧱 ОСНОВНОЙ СЕРВЕРНЫЙ КОМПОНЕНТ СТРАНИЦЫ
 */
export default async function OrdersPage({ params }: Props) {
  const { slug = [] } = await params;
  const [citySlug, categorySlug] = slug;

  // Воронка валидации: сначала быстрые куки. Если слага нет — мгновенный редирект
  const [currentGeo, feedState] = await Promise.all([
    getServerLocation(),
    getServerFeedState()
  ]);

  if (!citySlug) return redirect(`/orders/${currentGeo.slug}`);

  // Тянем данные через кэшированную функцию (0ms оверхеда, если generateMetadata уже выполнился)
  const { dbLocation, currentCategory } = await getCachedRouteData(citySlug, categorySlug);

  // Обработка 404/ошибок роутинга без лишнего серверного шума
  if (!dbLocation) return redirect(`/orders/${currentGeo.slug}`);
  if (categorySlug && !currentCategory) return redirect(`/orders/${citySlug}`);

  // Параллельный сбор сессии профиля
  const profileRes = await getMyProfile();
  const initialProfile = unwrap(profileRes, null);
  const skillIds = initialProfile?.skills.map(s => s.categoryId) || [];

  const initialFeedContext: FeedContext = {
    locationId: dbLocation.id,
    lat: dbLocation.lat,
    lng: dbLocation.lng,
    radius: feedState.radius,
    categoryId: currentCategory?.id || null,
    skillIds: skillIds.sort().join(','),
    viewMode: feedState.viewMode
  };

  const initialFeedData: InitialFeedData = {
    cityName: dbLocation.name,
    citySlug: dbLocation.slug,
    categoryName: currentCategory?.name || null,
    categorySlug: currentCategory?.slug || null,
    initialFeedContextHash: serializeDeterministic(initialFeedContext)
  };

  // Тяжелые промисы (Стриминг чанков через React.use)
  const ordersPromise = getOrders({
    ...initialFeedContext,
    mode: feedState.viewMode
  });

  const popularCategoriesPromise = getPopularCategories(
    initialFeedContext.lat,
    initialFeedContext.lng,
    initialFeedContext.radius
  );

  return (
    <FeedController
      ordersPromise={ordersPromise}
      initialProfile={initialProfile}
      initialFeedContext={initialFeedContext}
      initialFeedData={initialFeedData}
    >
      <OrdersPageUI popularCategoriesPromise={popularCategoriesPromise} />
    </FeedController>
  );
}
