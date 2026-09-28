import React, { useMemo } from 'react';
import { State } from '../model/state';
import { FollowerTab } from '../model/follower-tab';
import { LikerUserNode } from '../model/user';
import { DEFAULT_AUDIENCE_FILTERS } from '../model/audience-filters';
import { LEADERBOARD_ENTRIES_PER_PAGE } from '../constants/constants';
import { exportUsersAsCsv, getMaxPage, matchesAccountFilters, matchesLikesFilter } from '../utils/utils';
import { FilterPanel } from './FilterPanel';

interface FollowerAnalysisProps {
    state: State;
    setState: (state: State) => void;
}

type ResultsState = Extract<State, { status: 'results' }>;

const FollowerAnalysisInner = ({ state, setState }: { state: ResultsState; setState: (s: State) => void }) => {
    const {
        followerIds,
        followingIds,
        followerUsers,
        followingUsers,
        likerMap,
        followerTab,
        followerSearchTerm,
        followerPage,
        followingScope,
        followerScope,
        filters,
        hiddenUsers,
        followerSortBy,
    } = state;

    const categories = useMemo(() => {
        const followerSet = new Set(followerIds);
        const followingSet = new Set(followingIds);
        return {
            dontFollowBack: followingIds.filter(id => !followerSet.has(id)),
            notFollowingBack: followerIds.filter(id => !followingSet.has(id)),
            mutual: followingIds.filter(id => followerSet.has(id)),
            ghost: followerIds.filter(id => !likerMap[id]),
        };
    }, [followerIds, followingIds, likerMap]);

    const currentIds = useMemo(() => {
        switch (followerTab) {
            case 'dont_follow_back':
                return categories.dontFollowBack;
            case 'not_following_back':
                return categories.notFollowingBack;
            case 'mutual':
                return categories.mutual;
            case 'ghost':
                return categories.ghost;
        }
    }, [followerTab, categories]);

    const allUsers = useMemo<LikerUserNode[]>(
        () => currentIds
            .map(id => followerUsers[id] || followingUsers[id])
            .filter((user): user is LikerUserNode => user !== undefined),
        [currentIds, followerUsers, followingUsers],
    );

    const likesOf = (id: string) => likerMap[id]?.likesCount ?? 0;

    const filteredUsers = useMemo(() => {
        const hiddenSet = new Set(hiddenUsers);
        const term = followerSearchTerm.toLowerCase();
        const matching = allUsers.filter(u =>
            matchesAccountFilters(u, filters, hiddenSet)
            && (followerTab === 'ghost' || matchesLikesFilter(likerMap[u.id]?.likesCount ?? 0, filters.likes))
            && (term === ''
                || u.username.toLowerCase().includes(term)
                || u.full_name.toLowerCase().includes(term)),
        );
        switch (followerSortBy) {
            case 'likes':
                return [...matching].sort((a, b) =>
                    (likerMap[b.id]?.likesCount ?? 0) - (likerMap[a.id]?.likesCount ?? 0));
            case 'username':
                return [...matching].sort((a, b) => a.username.localeCompare(b.username));
            default:
                return matching;
        }
    }, [allUsers, followerSearchTerm, filters, hiddenUsers, likerMap, followerSortBy, followerTab]);

    const totalPages = getMaxPage(filteredUsers.length);

    const pageUsers = useMemo(
        () => filteredUsers.slice(
            (followerPage - 1) * LEADERBOARD_ENTRIES_PER_PAGE,
            followerPage * LEADERBOARD_ENTRIES_PER_PAGE,
        ),
        [filteredUsers, followerPage],
    );

    const setTab = (tab: FollowerTab) => {
        setState({ ...state, followerTab: tab, followerPage: 1, followerSearchTerm: '' });
    };

    const changePage = (delta: number) => {
        const next = followerPage + delta;
        if (next < 1 || next > totalPages) { return; }
        setState({ ...state, followerPage: next });
    };

    const setFollowerState = (patch: Partial<ResultsState>) => setState({ ...state, ...patch, followerPage: 1 });

    const tabs: Array<{ key: FollowerTab; label: string; count: number }> = [
        {
            key: 'dont_follow_back',
            label: followerScope === 'page_limit' ? 'No match in returned follower pages' : "They Don't Follow Back",
            count: categories.dontFollowBack.length,
        },
        {
            key: 'not_following_back',
            label: followingScope === 'page_limit' ? 'No match in returned following pages' : "You Don't Follow Back",
            count: categories.notFollowingBack.length,
        },
        { key: 'mutual', label: 'Mutual', count: categories.mutual.length },
        { key: 'ghost', label: 'No Identified Likes', count: categories.ghost.length },
    ];

    return (
        <section className='flex'>
            <aside className='app-sidebar'>
                <div className='sidebar-stats'>
                    <p>Followers returned: {followerIds.length}</p>
                    <p>Following returned: {followingIds.length}</p>
                    <p>Mutual: {categories.mutual.length}</p>
                </div>

                <label className='sidebar-search'>
                    <span>Search follower comparison</span>
                    <input
                        type='search'
                        placeholder='Username or name'
                        value={followerSearchTerm}
                        onChange={e => setState({
                            ...state,
                            followerSearchTerm: e.currentTarget.value,
                            followerPage: 1,
                        })}
                    />
                </label>

                <FilterPanel
                    filters={filters}
                    hiddenCount={hiddenUsers.length}
                    users={allUsers}
                    totalPosts={state.totalPostsScanned}
                    showFollowsYou={false}
                    showLikes={followerTab !== 'ghost'}
                    onChange={next => setFollowerState({ filters: next })}
                    onUnhideAll={() => setFollowerState({ hiddenUsers: [] })}
                    onReset={() => setFollowerState({ filters: DEFAULT_AUDIENCE_FILTERS, hiddenUsers: [] })}
                />

                <label className='filter-field'>
                    <span className='filter-label'>Sort by</span>
                    <select
                        className='filter-select'
                        value={followerSortBy}
                        onChange={e => setFollowerState({
                            followerSortBy: e.currentTarget.value as ResultsState['followerSortBy'],
                        })}
                    >
                        <option value='list'>Instagram order</option>
                        <option value='likes'>Most identified likes</option>
                        <option value='username'>Username A-Z</option>
                    </select>
                </label>

                <div className='sidebar-pagination'>
                    <p>Pages</p>
                    <div className='pagination-controls'>
                        <button
                            type='button'
                            className='pagination-btn'
                            onClick={() => changePage(-1)}
                            disabled={followerPage <= 1}
                            aria-label='Previous page'
                        >
                            &#10094;
                        </button>
                        <span>{followerPage}&nbsp;/&nbsp;{totalPages}</span>
                        <button
                            type='button'
                            className='pagination-btn'
                            onClick={() => changePage(1)}
                            disabled={followerPage >= totalPages}
                            aria-label='Next page'
                        >
                            &#10095;
                        </button>
                    </div>
                </div>

                <button
                    type='button'
                    className='export-btn'
                    disabled={filteredUsers.length === 0}
                    onClick={() => exportUsersAsCsv(
                        filteredUsers.map(user => ({ user, likesCount: likesOf(user.id) })),
                        tabs.find(t => t.key === followerTab)?.label ?? followerTab,
                        `follower-analysis-${followerTab}.csv`,
                    )}
                >
                    Export CSV
                </button>
            </aside>

            <article className='results-container'>
                <div className='tabs-container' role='group' aria-label='Follower categories'>
                    {tabs.map(t => (
                        <button
                            type='button'
                            key={t.key}
                            className={`tab follower-tab ${followerTab === t.key ? 'tab-active' : ''}`}
                            onClick={() => setTab(t.key)}
                            aria-pressed={followerTab === t.key}
                        >
                            {t.label} ({t.count})
                        </button>
                    ))}
                </div>

                {filteredUsers.length !== allUsers.length && (
                    <p className='filter-summary'>
                        Showing {filteredUsers.length.toLocaleString()} of {allUsers.length.toLocaleString()} accounts
                    </p>
                )}

                {pageUsers.length === 0 && (
                    <div className='empty-state'>
                        {followerSearchTerm
                            ? 'No results match your search.'
                            : allUsers.length > 0
                                ? 'No accounts match the current filters.'
                                : 'No users in this category.'}
                    </div>
                )}

                {pageUsers.map(user => {
                    const likes = likesOf(user.id);
                    return (
                        <div className='leaderboard-entry' key={user.id}>
                            <img
                                className='entry-avatar'
                                alt=''
                                src={user.profile_pic_url}
                                loading='lazy'
                            />
                            <div className='entry-info'>
                                <a
                                    className='entry-username'
                                    target='_blank'
                                    href={`/${user.username}`}
                                    rel='noopener noreferrer'
                                >
                                    {user.username}
                                    {user.is_verified && <span className='verified-badge'>&#10004;</span>}
                                </a>
                                <span className='entry-fullname'>{user.full_name}</span>
                            </div>
                            <div className={`follower-likes-info ${likes === 0 ? 'follower-likes-empty' : ''}`}>
                                {likes} identified likes
                            </div>
                            <button
                                type='button'
                                className='entry-hide-btn'
                                onClick={() => setFollowerState({ hiddenUsers: [...hiddenUsers, user.id] })}
                                title='Hide this user'
                                aria-label={`Hide ${user.username}`}
                            >
                                &#10005;
                            </button>
                        </div>
                    );
                })}
            </article>
        </section>
    );
};

export const FollowerAnalysis = ({ state, setState }: FollowerAnalysisProps) => {
    if (state.status !== 'results') {
        return null;
    }
    return <FollowerAnalysisInner state={state} setState={setState} />;
};
