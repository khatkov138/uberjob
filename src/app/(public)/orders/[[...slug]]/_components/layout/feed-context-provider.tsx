import { createContext, useContext, ReactNode } from 'react';
import { FeedContext } from '../../page';

const ActiveContext = createContext<FeedContext | null>(null);

// Хук для удобного доступа
export const useActiveFeed = () => {
    const ctx = useContext(ActiveContext);
    if (!ctx) throw new Error('useActiveFeed must be used within FeedProvider');
    return ctx;
};

export const FeedProvider = ({ value, children }: { value: FeedContext, children: ReactNode }) => (
    <ActiveContext.Provider value={value}>
        {children}
    </ActiveContext.Provider>
);
