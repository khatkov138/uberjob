"use server"

import prisma from "@/lib/prisma";

export async function getAllCategories() {
  try {
    return await prisma.category.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true }
    });
  } catch (error) {
    return [];
  }
}
