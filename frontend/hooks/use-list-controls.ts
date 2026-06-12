import { useState } from 'react';

export type SortDirection = 'asc' | 'desc';

export type SortOption<K extends string = string> = {
    key: K;
    labelAsc: string;
    labelDesc: string;
};

export function useListControls<K extends string>(defaultSortKey: K, defaultDirection: SortDirection = 'asc') {
    const [searchQuery, setSearchQuery] = useState('');
    const [sortKey, setSortKeyState] = useState<K>(defaultSortKey);
    const [sortDirection, setSortDirection] = useState<SortDirection>(defaultDirection);

    function setSortKey(key: K, direction?: SortDirection) {
        if (direction !== undefined) {
            setSortKeyState(key);
            setSortDirection(direction);
        } else if (key === sortKey) {
            setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortKeyState(key);
            setSortDirection('asc');
        }
    }

    return { searchQuery, setSearchQuery, sortKey, sortDirection, setSortKey };
}
