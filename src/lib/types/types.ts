import { Category, Order, Profile } from "@prisma/client";
import { ActionResponse } from "../server-utils";



export type InferActionResult<T extends (...args: any) => Promise<ActionResponse<any>>> =
  // 1. Сначала достаем data и СРАЗУ говорим, что нам не нужен null
  NonNullable<Awaited<ReturnType<T>>['data']> extends (infer U)[]
  ? U // 2. Если внутри массив — отдаем тип элемента
  : NonNullable<Awaited<ReturnType<T>>['data']>; 
  // 3. Если объект — отдаем чистый объект

