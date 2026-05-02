import { Metadata } from "next"
import { redirect } from "next/navigation"
import prisma from "@/lib/prisma"

// Libs & Actions
import { getServerSession } from "@/lib/get-session"
import { unwrap } from "@/lib/utils"
import { getOrders } from "@/actions/order/get"
import { getMyProfile } from "@/actions/profile/get"
import { getServerLocation } from "@/lib/server-utils"
import OrdersPageClient from "./OrdersPageClient"


interface Props {
  params: Promise<{ slug?: string[] }>
}

/**
 * SEO МЕТАДАННЫЕ
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const currentSlug = slug?.[0]

  if (currentSlug) {
    const location = await prisma.location.findUnique({
      where: { slug: currentSlug }
    })

    if (location) {
      return {
        title: `Работа и заказы: ${location.name} — ZWORK`,
        description: `Актуальные предложения для мастеров: ${location.name}. Поиск на карте и быстрые отклики.`
      }
    }
  }

  // Дефолтные метаданные (если слага нет или он не найден)
  const location = await getServerLocation()
  return {
    title: `Работа и заказы: ${location.city} — ZWORK`,
    description: `Найдено заказов в радиусе ${location.radius}км. Подключайтесь к ENGINE.`
  }
}

export default async function OrdersPage({ params }: Props) {
  const { slug } = await params;
  const currentSlug = slug?.[0]; // первый сегмент

  const session = await getServerSession();
  const locationFromCookies = await getServerLocation();

  // --- НОВАЯ ЛОГИКА РЕДИРЕКТА НА КРАСИВЫЙ URL ---
  if (!currentSlug) {
    // Ищем слаг для города, который сейчас в куках (или дефолтный)
    const dbLocation = await prisma.location.findFirst({
      where: { name: locationFromCookies.city }
    });

    // Если нашли в базе — принудительно перекидываем на URL со слагом
    if (dbLocation) {
      redirect(`/orders/${dbLocation.slug}`);
    }
  }
  // ----------------------------------------------

  let finalLocation = locationFromCookies;

  // Если слаг есть (мы уже в /orders/irkutsk)
  if (currentSlug) {
    const dbLocation = await prisma.location.findUnique({
      where: { slug: currentSlug }
    });

    if (dbLocation) {
      // Собираем полный объект локации для передачи на клиент
      finalLocation = {
        city: dbLocation.name,
        slug: dbLocation.slug, // Добавляем слаг из базы
        lat: dbLocation.lat,
        lng: dbLocation.lng,
        radius: locationFromCookies.radius,
      };
    } else {
      // Если города нет в базе — возвращаем на чистый /orders
      redirect("/orders");
    }
  }

  const [ordersRes, profileRes] = await Promise.all([
    getOrders(finalLocation),
    getMyProfile()
  ]);

  return (
    <OrdersPageClient
      session={session}
      initialOrders={unwrap(ordersRes, [])}
      initialProfile={unwrap(profileRes, null)}
      serverLocation={finalLocation}
    />
  );
}
