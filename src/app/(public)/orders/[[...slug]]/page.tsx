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
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
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
  // Твоя любимая деструктуризация без лишнего шума 🚀
  const { slug = [] } = await params;
  const [citySlug, categorySlug] = slug;

  /**
   * 📡 ШАГ 1: ПОЛУЧЕНИЕ ГЕОДАННЫХ И ДЕФОЛТНОГО СОСТОЯНИЯ (Server Utilities)
   * Читаем куки, заранее подготовленные прокси-сервером или middleware.
   * Тянем параллельно текущую локацию пользователя и состояние ленты (радиус, режим отображения).
   */
  const [currentGeo, feedState] = await Promise.all([
    getServerLocation(),
    getServerFeedState() 
  ]);

  /**
   * 🚦 ШАГ 2: ВОРОНКА ВАЛИДАЦИИ И РЕДИРЕКТЫ
   * Защищаем роутинг. Если в URL нет города, принудительно отправляем наSlug текущей гео-позиции.
   */
  if (!citySlug) return redirect(`/orders/${currentGeo.slug}`);

  // Извлекаем мемоизированные данные по городу и категории из БД
  const { dbLocation, currentCategory } = await getCachedRouteData(citySlug, categorySlug);

  // Если город в URL не валидный — дропаем пользователя на его дефолтный город
  if (!dbLocation) return redirect(`/orders/${currentGeo.slug}`);
  // Если категория в URL — фейк, мягко откатываем пользователя на корень текущего города
  if (categorySlug && !currentCategory) return redirect(`/orders/${citySlug}`);

  /**
   * 👤 ШАГ 3: ПРОФИЛЬ И СКИЛЛЫ ПОЛЬЗОВАТЕЛЯ
   * Получаем профиль текущего юзера, разворачиваем монаду и вытаскиваем массив ID его навыков.
   * Сортируем навыки для детерминированного хэширования контекста.
   */
  const profileRes = await getMyProfile();
  const initialProfile = unwrap(profileRes, null);
  const skillIds = initialProfile?.skills.map(s => s.categoryId) || [];

  /**
   * ⚙️ ШАГ 4: ФОРМИРОВАНИЕ ИНСТРУМЕНТАЛЬНОГО КОНТЕКСТА ФИДА (FeedContext)
   * Собираем слепок параметров, по которым будет фильтроваться лента на сервере и клиенте.
   */
  const initialFeedContext: FeedContext = {
    locationId: dbLocation.id,
    lat: dbLocation.lat,
    lng: dbLocation.lng,
    radius: feedState.radius,
    categoryId: currentCategory?.id || null,
    skillIds: skillIds.sort().join(','),
    viewMode: feedState.viewMode
  };

  /**
   * 📦 ШАГ 5: ИНИЦИАЛИЗАЦИЯ ДАННЫХ И ХЭШИРОВАНИЕ (InitialFeedData)
   * Формируем JSON-объект для гидратации клиента.
   * Детерминировано сериализуем контекст в строку-хэш для быстрого сравнения состояний на фронте.
   */
  const initialFeedData: InitialFeedData = {
    cityName: dbLocation.name,
    citySlug: dbLocation.slug,
    categoryName: currentCategory?.name || null,
    categorySlug: currentCategory?.slug || null,
    initialFeedContextHash: serializeDeterministic(initialFeedContext)
  };

  /**
   * ⚡ ШАГ 6: ЗАПУСК АСИНХРОННЫХ ПРОМИСОВ (Streaming / Запросы без блокировки)
   * Запускаем тяжелые запросы за заказами и популярными категориями параллельно.
   * Промисы прокидываются сквозь провайдер напрямую в UI-компоненты через Suspense / use().
   */
  const ordersPromise = getOrders({
    ...initialFeedContext,
    mode: initialFeedContext.viewMode
  });

  const popularCategoriesPromise = getPopularCategories(
    initialFeedContext.lat,
    initialFeedContext.lng,
    initialFeedContext.radius
  );

  /**
   * 🎛 ШАГ 7: РЕНДЕРИНГ И ПЕРЕДАЧА ДАННЫХ В КЛИЕНТСКИЙ КОНТЕКСТ
   * Оборачиваем страницу в контроллер фида, обеспечивая бесшовную синхронизацию SSR и CSR.
   */
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
