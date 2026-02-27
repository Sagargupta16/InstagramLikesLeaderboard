import { LikerUserNode, LikerAccumulator } from '../model/user';
import { LeaderboardEntry } from '../model/leaderboard-entry';
import { SortField } from '../model/sort-field';
import { LEADERBOARD_ENTRIES_PER_PAGE, IG_APP_ID } from '../constants/constants';

// --- Core helpers ---

export function assertUnreachable(_value: never): never {
    throw new Error('Statement should be unreachable');
}

export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
}

export function getCookie(name: string): string | null {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length !== 2) {
        return null;
    }
    return parts.pop()!.split(';').shift()!;
}

export function randomizedSleep(baseMs: number): number {
    return Math.floor(Math.random() * (baseMs - baseMs * 0.7)) + baseMs;
}

// --- Common fetch wrapper with IG headers ---

export function igFetch(url: string): Promise<Response> {
    const csrftoken = getCookie('csrftoken') || '';
    return fetch(url, {
        headers: {
            'x-ig-app-id': IG_APP_ID,
            'x-requested-with': 'XMLHttpRequest',
            'x-csrftoken': csrftoken,
        },
        credentials: 'include',
    });
}

// --- URL generators (Instagram v1 REST API) ---

export function userMediaUrlGenerator(nextMaxId?: string): string {
    const dsUserId = getCookie('ds_user_id');
    if (nextMaxId === undefined) {
        return `https://www.instagram.com/api/v1/feed/user/${dsUserId}/?count=12`;
    }
    return `https://www.instagram.com/api/v1/feed/user/${dsUserId}/?count=12&max_id=${nextMaxId}`;
}

export function postLikersUrlGenerator(mediaId: string): string {
    return `https://www.instagram.com/api/v1/media/${mediaId}/likers/`;
}

export function followingUrlGenerator(nextMaxId?: string): string {
    const dsUserId = getCookie('ds_user_id');
    if (nextMaxId === undefined) {
        return `https://www.instagram.com/api/v1/friendships/${dsUserId}/following/?count=200`;
    }
    return `https://www.instagram.com/api/v1/friendships/${dsUserId}/following/?count=200&max_id=${nextMaxId}`;
}

// --- Aggregation ---

export function buildLikerMap(
    existingMap: Record<string, LikerAccumulator>,
    likers: readonly LikerUserNode[],
): Record<string, LikerAccumulator> {
    const map = { ...existingMap };
    for (const liker of likers) {
        if (map[liker.id]) {
            map[liker.id] = {
                user: liker,
                likesCount: map[liker.id].likesCount + 1,
            };
        } else {
            map[liker.id] = {
                user: liker,
                likesCount: 1,
            };
        }
    }
    return map;
}

export function buildLeaderboard(
    likerMap: Readonly<Record<string, LikerAccumulator>>,
    followingIds: ReadonlySet<string>,
    totalPosts: number,
    isFollowing: boolean,
): LeaderboardEntry[] {
    const entries: LeaderboardEntry[] = [];

    for (const id of Object.keys(likerMap)) {
        const accumulator = likerMap[id];
        const userIsFollowed = followingIds.has(id);

        if (isFollowing !== userIsFollowed) {
            continue;
        }

        entries.push({
            user: accumulator.user,
            likesCount: accumulator.likesCount,
            totalPosts,
            percentage: Math.round((accumulator.likesCount / totalPosts) * 1000) / 10,
            rank: 0,
        });
    }

    // Default sort: by likesCount descending
    entries.sort((a, b) => b.likesCount - a.likesCount);
    for (let i = 0; i < entries.length; i++) {
        (entries[i] as { rank: number }).rank = i + 1;
    }

    return entries;
}

// --- Sort / Filter / Pagination ---

export function sortLeaderboard(
    entries: readonly LeaderboardEntry[],
    sortBy: SortField,
    direction: 'asc' | 'desc',
): LeaderboardEntry[] {
    const sorted = [...entries];
    sorted.sort((a, b) => {
        let comparison = 0;
        switch (sortBy) {
            case 'likes':
                comparison = a.likesCount - b.likesCount;
                break;
            case 'percentage':
                comparison = a.percentage - b.percentage;
                break;
            case 'username':
                comparison = a.user.username.localeCompare(b.user.username);
                break;
            default:
                assertUnreachable(sortBy);
        }
        return direction === 'desc' ? -comparison : comparison;
    });

    for (let i = 0; i < sorted.length; i++) {
        (sorted[i] as { rank: number }).rank = i + 1;
    }

    return sorted;
}

export function filterLeaderboard(
    entries: readonly LeaderboardEntry[],
    searchTerm: string,
): readonly LeaderboardEntry[] {
    if (searchTerm === '') {
        return entries;
    }
    const term = searchTerm.toLowerCase();
    return entries.filter(
        entry =>
            entry.user.username.toLowerCase().includes(term) ||
            entry.user.full_name.toLowerCase().includes(term),
    );
}

export function getMaxPage(totalEntries: number): number {
    const calc = Math.ceil(totalEntries / LEADERBOARD_ENTRIES_PER_PAGE);
    return calc < 1 ? 1 : calc;
}

export function getEntriesForPage(
    entries: readonly LeaderboardEntry[],
    page: number,
): readonly LeaderboardEntry[] {
    const start = (page - 1) * LEADERBOARD_ENTRIES_PER_PAGE;
    return entries.slice(start, start + LEADERBOARD_ENTRIES_PER_PAGE);
}

// --- Export ---

export function exportAsCsv(entries: readonly LeaderboardEntry[], filename: string): void {
    const header = 'Rank,Username,Full Name,Likes,Total Posts,Percentage\n';
    const rows = entries.map(e =>
        `${e.rank},"${e.user.username}","${e.user.full_name}",${e.likesCount},${e.totalPosts},${e.percentage}%`,
    ).join('\n');

    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

export function exportAsJson(entries: readonly LeaderboardEntry[], filename: string): void {
    const blob = new Blob([JSON.stringify(entries, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
