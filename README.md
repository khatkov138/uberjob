# ⚡️ ZWORK / ENGINE v2.0
> **UBER-MODEL FOR OFFLINE SERVICES** | NEXT.JS 16 • PRISMA • AI • PUSHER

![ZWORK DASHBOARD](https://githubusercontent.com) *(замени на ссылку на свой скрин)*

## 🦾 ТЕХНОЛОГИЧЕСКИЙ СТЭК
Проект собран на "стероидах" для максимальной скорости отклика:
- **FRAMEWORK:** [Next.js 16](https://nextjs.org) (App Router, Turbopack)
- **UI:** [Tailwind 4](https://tailwindcss.com) + [Shadcn/UI](https://shadcn.com) (Custom Neo-brutalism Style)
- **DATABASE:** [Prisma](https://prisma.io) + PostgreSQL
- **AI-DISPATCHER:** [Groq](https://groq.com) (Llama 3.3 70B) — автоматическая классификация ниш и генерация заголовков.
- **REAL-TIME:** [Pusher](https://pusher.com) — заказы влетают в ленту мгновенно, без Refresh.
- **STATE:** [Zustand](https://pmnd.rs) + [TanStack Query v5](https://tanstack.com)
- **GEO:** [Yandex Maps API](https://yandex.ru) (Suggest + Geocoder)

## 🧠 AI-КЛАССИФИКАЦИЯ (ZWORK DISPATCHER)
Вместо выбора из 1000 категорий, пользователь просто пишет: *"Потекла труба в ванной, залейте пол"*. 
**ИИ делает магию:**
1. Определяет нишу (напр. *Сантехника*).
2. Генерирует продающий заголовок.
3. Выделяет ключевые слова.
4. Синхронизирует справочник категорий в БД через `upsert`.

## 📍 ГЕО-РАДАР
Система работает по принципу радара:
- Мастер выставляет **радиус поиска** (10-100 км).
- Автоматический расчет дистанции по формуле **Haversine**.
- Мгновенная фильтрация заказов "под навыки" мастера (`isMatched`).

## 🛠 УСТАНОВКА
```bash
# Клонируй репозиторий
git clone https://github.com

# Установи зависимости (через force, так как мы на React 19)
npm install --force

# Настрой переменные окружения (.env.local)
GROQ_API_KEY=***
YANDEX_MAPS_KEY=***
PUSHER_SECRET=***

# Запускай двигатель
npm run dev
```

## 📈 ROADMAP
- [x] AI-Классификация заказов
- [x] Real-time лента (Pusher)
- [x] Гео-фильтрация и Suggest API
- [ ] **NEXT:** Интерактивная карта Яндекс (в разработке)
- [ ] Система чатов и откликов
- [ ] Платежный шлюз

---
**ZWORK** — *Работа должна летать.* 
Created by [khatkov138](https://github.com)
