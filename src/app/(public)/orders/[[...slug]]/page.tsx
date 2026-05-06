import { Metadata } from "next";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";

// Libs & Actions
import { getServerSession } from "@/lib/get-session";
import { unwrap } from "@/lib/utils";
import { getOrders, GetOrdersResponse } from "@/actions/order/get";
import { getMyProfile } from "@/actions/profile/get";
import { getPopularCategories } from "@/actions/category/get";

// Серверная логика
import { getServerLocation, getServerOrdersState } from "@/lib/server-utils";
import OrdersPageUI from "./OrdersPageUI";

export interface FeedContext {
  locationId: string;
  lat: number;
  lng: number;
  radius: number;
  name: string;
  slug: string;
  categoryId: string | null;
  skillIds: string[];
}

interface Props {
  params: Promise<{ slug?: string[] }>;
}

export default async function OrdersPage({ params }: Props) {
  const { slug = [] } = await params;
  const [citySlug, categorySlug] = slug;

  const session = await getServerSession();

  // 1. Получаем Гео и Настройки из кук параллельно
  const [currentGeo, ordersView] = await Promise.all([
    getServerLocation(),
    getServerOrdersState()
  ]);

  if (!citySlug) return redirect(`/orders/${currentGeo.slug}`);

  // 2. Поиск локации и категории
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

  // 3. Профиль и скиллы
  const profileRes = await getMyProfile();
  const initialProfile = unwrap(profileRes, null);
  const skillIds = initialProfile?.skills.map(s => s.categoryId) || [];

  const feedContext: FeedContext = {
    locationId: dbLocation.id,
    name: dbLocation.name,
    slug: dbLocation.slug,
    lat: dbLocation.lat,
    lng: dbLocation.lng,
    radius: ordersView.radius,
    categoryId: currentCategory?.id || null,
    skillIds
  };

  // 4. ДИНАМИЧЕСКИЙ ФЕТЧ (Фиксируем mode для стабильной типизации)
  const mode = ordersView.viewMode; // Тип: 'list' | 'map'

  // Чтобы TS не ругался на несовместимость, мы явно типизируем результат запроса
  const [ordersRes, popularRes] = await Promise.all([
    getOrders({
      ...feedContext,
      mode,
    }),
    getPopularCategories(feedContext.lat, feedContext.lng, feedContext.radius)
  ]);

  /** 
   * ЧИСТАЯ РАСПАКОВКА:
   * Мы передаем GetOrdersResponse<typeof mode> в дженерик unwrap.
   * Если ordersRes ругается, это значит, что в самом экшене getOrders 
   * возвращаемый тип не обернут в Promise<ActionResponse<GetOrdersResponse<T>>>.
   */
  const ssrOrdersData = unwrap<GetOrdersResponse<typeof mode>>(
    ordersRes,
    { orders: [], nextCursor: null, total: 0 }
  );

  return (
    <OrdersPageUI
      session={session}
      initialOrders={ssrOrdersData}
      initialProfile={initialProfile}
      feedContext={feedContext}
      popularCategories={unwrap(popularRes, [])}
      currentCategory={currentCategory}
      initialViewMode={mode}
    />
  );
}
