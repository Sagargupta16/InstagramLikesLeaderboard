import React, { useMemo, memo } from 'react';
import { State } from '../model/state';
import { SortField } from '../model/sort-field';
import { LeaderboardEntry } from '../model/leaderboard-entry';
import { TrophyIcon } from './icons/TrophyIcon';
import {
    filterLeaderboard,
    sortLeaderboard,
    getMaxPage,
    getEntriesForPage,
    exportAsCsv,
    exportAsJson,
} from '../utils/utils';

interface LeaderboardProps {
    state: State;
    setState: (state: State) => void;
}

interface RowProps {
    entry: LeaderboardEntry;
    barWidth: number;
    onHide: (userId: string) => void;
}

const LeaderboardRow = memo(({ entry, barWidth, onHide }: RowProps) => {
    let entryClass = 'leaderboard-entry';
    let rankClass = 'entry-rank';
    if (entry.rank === 1) {
        entryClass += ' top-1';
        rankClass += ' rank-1';
    } else if (entry.rank === 2) {
        entryClass += ' top-2';
        rankClass += ' rank-2';
    } else if (entry.rank === 3) {
        entryClass += ' top-3';
        rankClass += ' rank-3';
    }

    return (
        <div className={entryClass}>
            <div className={rankClass}>
                {entry.rank <= 3 ? <TrophyIcon rank={entry.rank} /> : `#${entry.rank}`}
            </div>
            <img
                className='entry-avatar'
                alt={entry.user.username}
                src={entry.user.profile_pic_url}
                loading='lazy'
            />
            <div className='entry-info'>
                <a
                    className='entry-username'
                    target='_blank'
                    href={`/${entry.user.username}`}
                    rel='noreferrer'
                >
                    {entry.user.username}
                    {entry.user.is_verified && <span className='verified-badge'>&#10004;</span>}
                </a>
                <span className='entry-fullname'>{entry.user.full_name}</span>
            </div>
            <div className='entry-likes-bar'>
                <div className='likes-bar-fill' style={{ width: `${barWidth}%` }} />
                <span className='likes-bar-text'>
                    {entry.likesCount}/{entry.totalPosts}
                </span>
            </div>
            <div className='entry-percentage'>{entry.percentage}%</div>
            <button
                type='button'
                className='entry-hide-btn'
                onClick={() => onHide(entry.user.id)}
                title='Hide this user'
                aria-label={`Hide ${entry.user.username}`}
            >
                &#10005;
            </button>
        </div>
    );
});

// Narrow once at the top so hooks below see a concrete shape.
type ResultsState = Extract<State, { status: 'results' }>;

const LeaderboardInner = ({ state, setState }: { state: ResultsState; setState: (s: State) => void }) => {
    const {
        currentTab,
        followingLeaderboard,
        notFollowingLeaderboard,
        hideVerified,
        hiddenUsers,
        sortBy,
        sortDirection,
        searchTerm,
        page,
    } = state;

    const visibleEntries = useMemo(() => {
        const source = currentTab === 'following'
            ? followingLeaderboard
            : notFollowingLeaderboard;

        const hiddenSet = hiddenUsers.length > 0 ? new Set(hiddenUsers) : null;

        if (!hideVerified && !hiddenSet) {
            return source;
        }

        return source.filter(e => {
            if (hideVerified && e.user.is_verified) { return false; }
            if (hiddenSet?.has(e.user.id)) { return false; }
            return true;
        });
    }, [currentTab, followingLeaderboard, notFollowingLeaderboard, hideVerified, hiddenUsers]);

    const sortedEntries = useMemo(
        () => sortLeaderboard(visibleEntries, sortBy, sortDirection),
        [visibleEntries, sortBy, sortDirection],
    );

    const filteredEntries = useMemo(
        () => filterLeaderboard(sortedEntries, searchTerm),
        [sortedEntries, searchTerm],
    );

    const { pageEntries, maxPage, maxPercentage } = useMemo(() => {
        const pe = getEntriesForPage(filteredEntries, page);
        const mp = getMaxPage(filteredEntries.length);
        const maxPct = filteredEntries.length > 0
            ? Math.max(...filteredEntries.map(e => e.percentage))
            : 100;
        return { pageEntries: pe, maxPage: mp, maxPercentage: maxPct };
    }, [filteredEntries, page]);

    const handleSortChange = (nextSort: SortField) => {
        setState({ ...state, sortBy: nextSort, page: 1 });
    };

    const toggleSortDirection = () => {
        setState({
            ...state,
            sortDirection: sortDirection === 'desc' ? 'asc' : 'desc',
            page: 1,
        });
    };

    const hideUser = (userId: string) => {
        setState({ ...state, hiddenUsers: [...hiddenUsers, userId] });
    };

    const changePage = (delta: number) => {
        const next = page + delta;
        if (next < 1 || next > maxPage) { return; }
        setState({ ...state, page: next });
    };

    const switchTab = (tab: 'following' | 'not_following') => {
        if (currentTab === tab) { return; }
        setState({ ...state, currentTab: tab, page: 1, searchTerm: '' });
    };

    return (
        <section className='flex'>
            <aside className='app-sidebar'>
                <div className='sidebar-stats'>
                    <p>Posts scanned: {state.totalPostsScanned}</p>
                    <p>Unique likers: {state.totalUniqueLikers}</p>
                    <p>Total likes: {state.totalLikes}</p>
                    <p>Following who liked: {followingLeaderboard.length}</p>
                    <p>Non-following who liked: {notFollowingLeaderboard.length}</p>
                </div>

                <div className='filter-controls'>
                    <p>Filters</p>
                    <label className='badge filter-toggle'>
                        <input
                            type='checkbox'
                            checked={hideVerified}
                            onChange={() => setState({ ...state, hideVerified: !hideVerified, page: 1 })}
                        />
                        <span>Hide verified accounts</span>
                    </label>
                    {hiddenUsers.length > 0 && (
                        <button
                            type='button'
                            className='sort-direction-btn'
                            onClick={() => setState({ ...state, hiddenUsers: [], page: 1 })}
                        >
                            Unhide all ({hiddenUsers.length})
                        </button>
                    )}
                </div>

                <div className='sort-controls'>
                    <p>Sort by</p>
                    <menu className='flex column m-clear p-clear'>
                        <label className='badge'>
                            <input
                                type='radio'
                                name='sortBy'
                                checked={sortBy === 'likes'}
                                onChange={() => handleSortChange('likes')}
                            />
                            <span>Like count</span>
                        </label>
                        <label className='badge'>
                            <input
                                type='radio'
                                name='sortBy'
                                checked={sortBy === 'percentage'}
                                onChange={() => handleSortChange('percentage')}
                            />
                            <span>Percentage</span>
                        </label>
                        <label className='badge'>
                            <input
                                type='radio'
                                name='sortBy'
                                checked={sortBy === 'username'}
                                onChange={() => handleSortChange('username')}
                            />
                            <span>Username</span>
                        </label>
                    </menu>
                    <button type='button' className='sort-direction-btn' onClick={toggleSortDirection}>
                        {sortDirection === 'desc' ? 'Descending' : 'Ascending'}
                    </button>
                </div>

                <div className='sidebar-pagination'>
                    <p>Pages</p>
                    <div className='pagination-controls'>
                        <button
                            type='button'
                            className='pagination-btn'
                            onClick={() => changePage(-1)}
                            disabled={page <= 1}
                            aria-label='Previous page'
                        >
                            &#10094;
                        </button>
                        <span>{page}&nbsp;/&nbsp;{maxPage}</span>
                        <button
                            type='button'
                            className='pagination-btn'
                            onClick={() => changePage(1)}
                            disabled={page >= maxPage}
                            aria-label='Next page'
                        >
                            &#10095;
                        </button>
                    </div>
                </div>

                <button
                    type='button'
                    className='export-btn'
                    disabled={filteredEntries.length === 0}
                    onClick={() => exportAsCsv(filteredEntries, `likes-leaderboard-${currentTab}.csv`)}
                >
                    Export CSV
                </button>
                <button
                    type='button'
                    className='export-btn'
                    disabled={filteredEntries.length === 0}
                    onClick={() => exportAsJson(filteredEntries, `likes-leaderboard-${currentTab}.json`)}
                >
                    Export JSON
                </button>
            </aside>

            <article className='results-container'>
                <nav className='tabs-container'>
                    <button
                        type='button'
                        className={`tab ${currentTab === 'following' ? 'tab-active' : ''}`}
                        onClick={() => switchTab('following')}
                    >
                        Following ({followingLeaderboard.length})
                    </button>
                    <button
                        type='button'
                        className={`tab ${currentTab === 'not_following' ? 'tab-active' : ''}`}
                        onClick={() => switchTab('not_following')}
                    >
                        Not Following ({notFollowingLeaderboard.length})
                    </button>
                </nav>

                {pageEntries.length === 0 && (
                    <div className='empty-state'>
                        {searchTerm ? 'No results match your search.' : 'No likers found in this category.'}
                    </div>
                )}

                {pageEntries.map(entry => {
                    const barWidth = maxPercentage > 0
                        ? (entry.percentage / maxPercentage) * 100
                        : 0;
                    return (
                        <LeaderboardRow
                            key={entry.user.id}
                            entry={entry}
                            barWidth={barWidth}
                            onHide={hideUser}
                        />
                    );
                })}
            </article>
        </section>
    );
};

export const Leaderboard = ({ state, setState }: LeaderboardProps) => {
    if (state.status !== 'results') {
        return null;
    }
    return <LeaderboardInner state={state} setState={setState} />;
};
