// hooks/use-user-skills.ts
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { FullProfile } from "@/actions/profile/get";

export function useUserSkills() {
  const { data: profile } = useQuery<FullProfile | null>({
    queryKey: ["user-profile"],
    // Указываем, что хук пассивно читает данные из кеша
    enabled: false, 
    // Заглушка для TS, так как данные поставляет OrdersPageClient через initialData
    queryFn: () => { throw new Error("Profile must be hydrated in OrdersPageClient") },
    staleTime: Infinity,
  });

  const skillIds = useMemo(() =>
    new Set(profile?.skills?.map(s => s.categoryId) || []),
    [profile]
  );

  const isMatched = (categoryIds: string[]) =>
    categoryIds.some(id => skillIds.has(id));

  return {
    profile: profile ?? null, // Гарантируем FullProfile | null
    skillIds,
    isMatched,
    hasSkills: skillIds.size > 0,
    count: skillIds.size
  };
}
