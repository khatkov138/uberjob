"use server"

import prisma from "@/lib/prisma";

export async function analyzeTask(description: string) {
    try {
        const apiKey = process.env.GROQ_API_KEY;
        const uri = process.env.GROQ_URI;

        if (!apiKey || !uri) throw new Error("Конфигурация ИИ отсутствует");

        const existing = await prisma.category.findMany({
            select: { name: true },
            take: 60
        });
        const categoriesContext = existing.map(c => c.name).join(", ");

        const response = await fetch(uri, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [
                    {
                        role: "system",
                        content: `Ты — старший диспетчер ZWORK. Классифицируй заказ.
            СПИСОК НИШ: [${categoriesContext}]
            
            ПРАВИЛА:
            1. Если ниши нет — создай новую (ед.ч., с Большой буквы).
            2. Формат строго JSON.
            3. Будь технически точен.`
                    },
                    { role: "user", content: description }
                ],
                response_format: { type: "json_object" },
                temperature: 0
            })
        });

        const result = await response.json();
        const rawContent = result.choices?.[0]?.message?.content;

        if (!rawContent) throw new Error("ИИ вернул пустой ответ");

        const content = JSON.parse(rawContent.replace(/```json|```/g, "").trim());

        if (content.categories) {
            content.categories = content.categories.map((c: any) => ({
                name: c.name.trim().charAt(0).toUpperCase() + c.name.trim().slice(1).toLowerCase(),
                keywords: Array.isArray(c.keywords) ? c.keywords : []
            })).slice(0, 3);
        }

        return content;
    } catch (error) {
        console.error("ZWORK_AI_ERROR:", error);
        // Важно: кидаем ошибку, чтобы createAuthAction её поймал!
        throw new Error(error instanceof Error ? error.message : "Ошибка анализа текста");
    }
}
