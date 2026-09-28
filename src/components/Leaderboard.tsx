import React, { useMemo } from 'react';
import { State } from '../model/state';
import { SortField } from '../model/sort-field';
import { LeaderboardEntry } from '../model/leaderboard-entry';
import { TrophyIcon } from './icons/TrophyIcon';
import { FilterPanel } from './FilterPanel';
import { DEFAULT_AUDIENCE_FILTERS } from '../model/audience-filters';
import {
    filterLeaderboard,
    matchesAccountFilters,
    matchesLikesFilter,
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

const LeaderboardRow = ({ entry, barWidth, onHide }: RowProps) => {
    let entryClass = 'leaderboard-entry leaderboard-row';
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
                alt=''
                src={entry.user.profile_pic_url}
                loading='lazy'
            />
            <div className='entry-info'>
                <a
                    className='entry-username'
                    target='_blank'
                    href={`/${entry.user.username}`}
                    rel='noopener noreferrer'
                >
                    {entry.user.username}
                    {entry.user.is_verified && <span className='verified-badge'>&#10004;</span>}
                </a>
                <span className='entry-fullname'>{entry.user.full_name}</span>
            </div>
            <div className='entry-likes-bar'>
                <div className='likes-bar-fill' style={{ width: `${barWidth}%` }} />
                <span className='likes-bar-text' title='Identified likes / posts scanned'>
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
};

// Narrow once at the top so hooks below see a concrete shape.
type ResultsState = Extract<State, { status: 'results' }>;

const LeaderboardInner = ({ state, setState }: { state: ResultsState; setState: (s: State) => void }) => {
    const {
        currentTab,
        followingLeaderboard,
        notFollowingLeaderboard,
        filters,
        hiddenUsers,
        sortBy,
        sortDirection,
        searchTerm,
        page,
        followingScope,
        followerScope,
        followerIds,
    } = state;
    const hasFollowerData = followerScope !== null;

    const notFollowingLabel = followingScope === 'page_limit'
        ? 'Not in returned following pages'
        : 'You do not follow';
    const exportCategory = currentTab === 'not_following' && followingScope === 'page_limit'
        ? 'no-following-match'
        : currentTab;

    const visibleEntries = useMemo(() => {
        const source = currentTab === 'following'
            ? followingLeaderboard
            : notFollowingLeaderboard;
        const hiddenSet = new Set(hiddenUsers);
        const followerSet = new Set(followerIds);
        const followsYou = hasFollowerData ? filters.followsYou : 'all';

        return source.filter(e => matchesAccountFilters(e.user, filters, hiddenSet)
            && matchesLikesFilter(e.likesCount, filters.likes)
            && (followsYou === 'all' || (followsYou === 'yes') === followerSet.has(e.user.id)));
    }, [currentTab, followingLeaderboard, notFollowingLeaderboard, filters, hiddenUsers, followerIds, hasFollowerData]);

    const tabUsers = useMemo(
        () => (currentTab === 'following' ? followingLeaderboard : notFollowingLeaderboard).map(e => e.user),
        [currentTab, followingLeaderboard, notFollowingLeaderboard],
    );

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
        setState({ ...state, hiddenUsers: [...hiddenUsers, userId], page: 1 });
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

    let emptyMessage = 'No likers found in this category.';
    if (searchTerm) {
        emptyMessage = 'No results match your search.';
    } else if (visibleEntries.length === 0 && tabUsers.length > 0) {
        emptyMessage = 'No accounts match the current filters.';
    }

    return (
        <section className='flex'>
            <aside className='app-sidebar'>
                <div className='sidebar-stats'>
                    <p>Posts scanned: {state.totalPostsScanned}</p>
                    <p>Identified likers: {state.totalUniqueLikers}</p>
                    <p>Displayed post likes: {state.totalLikes.toLocaleString()}</p>
                    <p>You follow: {followingLeaderboard.length}</p>
                    <p>{notFollowingLabel}: {notFollowingLeaderboard.length}</p>
                </div>

                <label className='sidebar-search'>
                    <span>Search leaderboard</span>
                    <input
                        type='search'
                        value={searchTerm}
                        placeholder='Username or name'
                        onChange={event => setState({
                            ...state,
                            searchTerm: event.currentTarget.value,
                            page: 1,
                        })}
                    />
                </label>

                <FilterPanel
                    filters={filters}
                    hiddenCount={hiddenUsers.length}
                    users={tabUsers}
                    totalPosts={state.totalPostsScanned}
                    showFollowsYou={hasFollowerData}
                    showLikes
                    onChange={next => setState({ ...state, filters: next, page: 1 })}
                    onUnhideAll={() => setState({ ...state, hiddenUsers: [], page: 1 })}
                    onReset={() => setState({ ...state, filters: DEFAULT_AUDIENCE_FILTERS, hiddenUsers: [], page: 1 })}
                />

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
                            <span>Identified likes</span>
                        </label>
                        <label className='badge'>
                            <input
                                type='radio'
                                name='sortBy'
                                checked={sortBy === 'percentage'}
                                onChange={() => handleSortChange('percentage')}
                            />
                            <span>Participation</span>
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
                    onClick={() => exportAsCsv(filteredEntries, `likes-leaderboard-${exportCategory}.csv`)}
                >
                    Export CSV
                </button>
                <button
                    type='button'
                    className='export-btn'
                    disabled={filteredEntries.length === 0}
                    onClick={() => exportAsJson(filteredEntries, `likes-leaderboard-${exportCategory}.json`)}
                >
                    Export JSON
                </button>
            </aside>

            <article className='results-container'>
                <div className='tabs-container' role='group' aria-label='Leaderboard categories'>
                    <button
                        type='button'
                        className={`tab ${currentTab === 'following' ? 'tab-active' : ''}`}
                        onClick={() => switchTab('following')}
                        aria-pressed={currentTab === 'following'}
                    >
                        You follow ({followingLeaderboard.length})
                    </button>
                    <button
                        type='button'
                        className={`tab ${currentTab === 'not_following' ? 'tab-active' : ''}`}
                        onClick={() => switchTab('not_following')}
                        aria-pressed={currentTab === 'not_following'}
                    >
                        {notFollowingLabel} ({notFollowingLeaderboard.length})
                    </button>
                </div>

                {filteredEntries.length !== tabUsers.length && (
                    <p className='filter-summary'>
                        Showing {filteredEntries.length.toLocaleString()} of {tabUsers.length.toLocaleString()} accounts
                    </p>
                )}

                {pageEntries.length === 0 && (
                    <div className='empty-state'>
                        {emptyMessage}
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
