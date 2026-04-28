import prisma from "@/lib/prisma";

export async function analyzeTask(description: string) {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    const uri = process.env.GROQ_URI;

    // Сначала тянем существующие ниши для контекста
    const existing = await prisma.category.findMany({
        select: { name: true },
        take: 50
    });
    const categoriesContext = existing.map(c => c.name).join(", ");

    const response = await fetch(uri!, {
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
            content: `Ты диспетчер ZWORK. Твоя задача — классифицировать заказ.
            Используй список категорий: [${categoriesContext}]
            
            ВЕРНИ СТРОГО JSON:
            {
              "title": "Короткий заголовок (4-6 слов)",
              "categories": [
                { "name": "Название", "keywords": ["слово1", "слово2"] }
              ]
            }
            Если подходящей категории нет — создай (Ед.ч., С большой буквы).`
          },
          { role: "user", content: description }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1
      })
    });

    const result = await response.json();
    const content = JSON.parse(result.choices[0].message.content);

    // Гарантируем структуру, даже если ИИ "ошибся"
    return {
      title: content.title || description.slice(0, 40) + "...",
      categories: (content.categories || []).map((c: any) => ({
        name: c.name.trim().charAt(0).toUpperCase() + c.name.trim().slice(1).toLowerCase(),
        keywords: Array.isArray(c.keywords) ? c.keywords : []
      })).slice(0, 2) // берем 2 самые точные
    };
  } catch (error) {
    console.error("AI_ERROR:", error);
    // Фолбэк, чтобы база не упала
    return {
      title: "Новый заказ",
      categories: [{ name: "Другое", keywords: [] }]
    };
  }
}
