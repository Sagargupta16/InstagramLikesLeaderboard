import React from 'react';
import { State } from '../model/state';
import { SortField } from '../model/sort-field';
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

export const Leaderboard = ({ state, setState }: LeaderboardProps) => {
    if (state.status !== 'results') {
        return null;
    }

    const currentEntries = state.currentTab === 'following'
        ? state.followingLeaderboard
        : state.notFollowingLeaderboard;

    const sorted = sortLeaderboard(currentEntries, state.sortBy, state.sortDirection);
    const filtered = filterLeaderboard(sorted, state.searchTerm);
    const pageEntries = getEntriesForPage(filtered, state.page);
    const maxPage = getMaxPage(filtered.length);
    const maxPercentage = filtered.length > 0 ? Math.max(...filtered.map(e => e.percentage)) : 100;

    const handleSortChange = (sortBy: SortField) => {
        if (state.status !== 'results') {
            return;
        }
        setState({
            ...state,
            sortBy,
            page: 1,
        });
    };

    const toggleSortDirection = () => {
        if (state.status !== 'results') {
            return;
        }
        setState({
            ...state,
            sortDirection: state.sortDirection === 'desc' ? 'asc' : 'desc',
            page: 1,
        });
    };

    return (
        <section className='flex'>
            <aside className='app-sidebar'>
                {/* Stats */}
                <div className='sidebar-stats'>
                    <p>Posts scanned: {state.totalPostsScanned}</p>
                    <p>Unique likers: {state.totalUniqueLikers}</p>
                    <p>Total likes: {state.totalLikes}</p>
                    <p>Following who liked: {state.followingLeaderboard.length}</p>
                    <p>Non-following who liked: {state.notFollowingLeaderboard.length}</p>
                </div>

                {/* Sort controls */}
                <div className='sort-controls'>
                    <p>Sort by</p>
                    <menu className='flex column m-clear p-clear'>
                        <label className='badge m-small'>
                            <input
                                type='radio'
                                name='sortBy'
                                checked={state.sortBy === 'likes'}
                                onChange={() => handleSortChange('likes')}
                            />
                            &nbsp;Like count
                        </label>
                        <label className='badge m-small'>
                            <input
                                type='radio'
                                name='sortBy'
                                checked={state.sortBy === 'percentage'}
                                onChange={() => handleSortChange('percentage')}
                            />
                            &nbsp;Percentage
                        </label>
                        <label className='badge m-small'>
                            <input
                                type='radio'
                                name='sortBy'
                                checked={state.sortBy === 'username'}
                                onChange={() => handleSortChange('username')}
                            />
                            &nbsp;Username
                        </label>
                    </menu>
                    <button className='sort-direction-btn' onClick={toggleSortDirection}>
                        {state.sortDirection === 'desc' ? 'Descending' : 'Ascending'}
                    </button>
                </div>

                {/* Pagination */}
                <div className='sidebar-pagination'>
                    <p>Pages</p>
                    <div className='pagination-controls'>
                        <a
                            onClick={() => {
                                if (state.status === 'results' && state.page > 1) {
                                    setState({ ...state, page: state.page - 1 });
                                }
                            }}
                        >
                            &#10094;
                        </a>
                        <span>{state.page}&nbsp;/&nbsp;{maxPage}</span>
                        <a
                            onClick={() => {
                                if (state.status === 'results' && state.page < maxPage) {
                                    setState({ ...state, page: state.page + 1 });
                                }
                            }}
                        >
                            &#10095;
                        </a>
                    </div>
                </div>

                {/* Export */}
                <button
                    className='export-btn'
                    disabled={filtered.length === 0}
                    onClick={() => exportAsCsv(filtered, `likes-leaderboard-${state.currentTab}.csv`)}
                >
                    Export CSV
                </button>
                <button
                    className='export-btn'
                    disabled={filtered.length === 0}
                    onClick={() => exportAsJson(filtered, `likes-leaderboard-${state.currentTab}.json`)}
                >
                    Export JSON
                </button>
            </aside>

            <article className='results-container'>
                {/* Tabs */}
                <nav className='tabs-container'>
                    <div
                        className={`tab ${state.currentTab === 'following' ? 'tab-active' : ''}`}
                        onClick={() => {
                            if (state.status === 'results' && state.currentTab !== 'following') {
                                setState({ ...state, currentTab: 'following', page: 1, searchTerm: '' });
                            }
                        }}
                    >
                        Following ({state.followingLeaderboard.length})
                    </div>
                    <div
                        className={`tab ${state.currentTab === 'not_following' ? 'tab-active' : ''}`}
                        onClick={() => {
                            if (state.status === 'results' && state.currentTab !== 'not_following') {
                                setState({ ...state, currentTab: 'not_following', page: 1, searchTerm: '' });
                            }
                        }}
                    >
                        Not Following ({state.notFollowingLeaderboard.length})
                    </div>
                </nav>

                {/* Leaderboard entries */}
                {pageEntries.length === 0 && (
                    <div className='p-large t-center' style={{ color: '#888' }}>
                        {state.searchTerm ? 'No results match your search.' : 'No likers found in this category.'}
                    </div>
                )}
                {pageEntries.map(entry => {
                    const barWidth = maxPercentage > 0
                        ? (entry.percentage / maxPercentage) * 100
                        : 0;

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
                        <div className={entryClass} key={entry.user.id}>
                            <div className={rankClass}>
                                {entry.rank <= 3
                                    ? <TrophyIcon rank={entry.rank} />
                                    : `#${entry.rank}`
                                }
                            </div>
                            <img
                                className='entry-avatar'
                                alt={entry.user.username}
                                src={entry.user.profile_pic_url}
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
                                <div
                                    className='likes-bar-fill'
                                    style={{ width: `${barWidth}%` }}
                                />
                                <span className='likes-bar-text'>
                                    {entry.likesCount}/{entry.totalPosts}
                                </span>
                            </div>
                            <div className='entry-percentage'>{entry.percentage}%</div>
                        </div>
                    );
                })}
            </article>
        </section>
    );
};
