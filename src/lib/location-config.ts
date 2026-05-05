export const LOCATION_CONFIG = {
    // Данные для инициализации базы и фолбэка в SSR
    DEFAULT: {
        city: "Москва",
        slug: "moskva",
        lat: 55.755819,
        lng: 37.617644,
        yandexUri: "ymapsbm1://geo?data=Cgg1MzE2NjM5MxIa0KDQvtGB0YHQuNGPLCDQnNC-0YHQutCy0LA,",
    },

    // Настройки фильтров по умолчанию
    SETTINGS: {
        radius: 100,
        radiusOptions: [10, 30, 50, 100],
    },

    // Утилиты
    utils: {
        // Округление до 6 знаков (точность ~10см)
        roundCoord: (num: number) => Math.round(num * 1000000) / 1000000,
    }
} as const;

// Типизация для использования в приложении
export type LocationConfig = typeof LOCATION_CONFIG;