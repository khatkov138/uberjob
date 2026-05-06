'use client';

import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { FeedContext } from '../../page';
import { GetOrdersResponse } from '@/actions/order/get';
import { useUserSkills } from '@/hooks/use-user-skills';

interface Props {
  currentCategory: { name: string } | null;
}

export function OrdersPageHeader({ currentCategory }: Props) {
  const { hasSkills } = useUserSkills();

  // 1. Читаем активный контекст из шины (Observer Bus)
  const { data: context } = useQuery<FeedContext>({
    queryKey: ['feed-context'],
    queryFn: () => { throw new Error("Observer: feed-context missing") },
    enabled: false,
  });

  // 2. Подписываемся на СПИСОК (Infinite Query)
  const infiniteQuery = useInfiniteQuery<GetOrdersResponse<'list'>>({
    queryKey: ["orders", "list", context],
    queryFn: () => { throw new Error("Observer: list data missing") },
    enabled: false,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage: GetOrdersResponse) => lastPage.nextCursor,

  });

  // 3. Подписываемся на КАРТУ (Обычный Query)
  const mapQuery = useQuery<GetOrdersResponse<'map'>>({
    queryKey: ["orders", "map", context],
    queryFn: () => { throw new Error("Observer: map data missing") },
    enabled: false,
  });

  // 4. ЛОГИКА ПОЛУЧЕНИЯ TOTAL
  // Берем total из первой страницы списка или из данных карты
  const infiniteTotal = infiniteQuery.data?.pages[0]?.total;
  const mapTotal = mapQuery.data?.total;

  const isFetching = infiniteQuery.isFetching || mapQuery.isFetching;

  // Если идет загрузка НОВОГО контекста (старых данных для этого ключа еще нет)
  const isInitialLoading = isFetching && infiniteTotal === undefined && mapTotal === undefined;

  // Итоговое количество (0, если еще ничего не загрузилось)
  const totalCount = infiniteTotal ?? mapTotal ?? 0;

  return (
    <div className="px-2 pt-4 pb-8 space-y-4">
      <div className="flex items-baseline gap-4 flex-wrap">
        <h2 className="text-5xl font-black italic uppercase tracking-tighter text-slate-900 leading-none">
          {currentCategory ? (
            <>
              {currentCategory.name}{" "}
              <span className="text-blue-600 ml-2 whitespace-nowrap">
                в {context?.name}
              </span>
            </>
          ) : (
            <>
              Заказы{" "}
              <span className="text-blue-600 ml-2 whitespace-nowrap">
                в {context?.name}
              </span>
            </>
          )}
        </h2>

        <div className="flex items-center gap-3">
          <span className="text-5xl font-black italic text-slate-100">/</span>
          <span className="text-5xl font-black italic text-slate-900 tracking-tighter">
            {isInitialLoading ? "..." : totalCount}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase italic">
        <div
          className={cn(
            "flex items-center gap-1.5 px-2 py-0.5 rounded-md border transition-colors duration-300",
            isFetching
              ? "bg-blue-50 border-blue-100 text-blue-600"
              : "bg-emerald-50 border-emerald-100 text-emerald-600"
          )}
        >
          <div
            className={cn(
              "w-1 h-1 rounded-full",
              isFetching ? "bg-blue-500 animate-pulse" : "bg-emerald-500"
            )}
          />
          <span>
            {isInitialLoading
              ? "Поиск..."
              : isFetching
                ? "Обновление..."
                : `Найдено: ${totalCount}`
            }
          </span>
        </div>

        <span className="ml-2">
          {!currentCategory && hasSkills ? "Ваши ниши" : "Все категории"}
          {context && ` • ${context.radius}км`}
        </span>
      </div>
    </div>
  );
}
