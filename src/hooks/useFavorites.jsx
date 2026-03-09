import { useState, useEffect } from 'react';

const STORAGE_KEY = 'mercatenerife_favorites';

const useFavorites = () => {
    const [favorites, setFavorites] = useState(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch (e) {
            console.error('Error loading favorites from localStorage:', e);
            return [];
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
        } catch (e) {
            console.error('Error saving favorites to localStorage:', e);
        }
    }, [favorites]);

    const toggleFavorite = (productId) => {
        setFavorites(prev => {
            if (prev.includes(productId)) {
                return prev.filter(id => id !== productId);
            } else {
                return [...prev, productId];
            }
        });
    };

    const isFavorite = (productId) => {
        return favorites.includes(productId);
    };

    return { favorites, toggleFavorite, isFavorite };
};

export default useFavorites;
