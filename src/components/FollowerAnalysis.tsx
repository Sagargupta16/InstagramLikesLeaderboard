import React, { useMemo } from 'react';
import { State } from '../model/state';
import { FollowerTab } from '../model/follower-tab';
import { LikerUserNode } from '../model/user';
import { LEADERBOARD_ENTRIES_PER_PAGE } from '../constants/constants';

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
            .filter(Boolean),
        [currentIds, followerUsers, followingUsers],
    );

    const filteredUsers = useMemo(() => {
        if (!followerSearchTerm) { return allUsers; }
        const term = followerSearchTerm.toLowerCase();
        return allUsers.filter(u =>
            u.username.toLowerCase().includes(term) ||
            u.full_name.toLowerCase().includes(term),
        );
    }, [allUsers, followerSearchTerm]);

    const totalPages = Math.max(1, Math.ceil(filteredUsers.length / LEADERBOARD_ENTRIES_PER_PAGE));

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

    const tabs: Array<{ key: FollowerTab; label: string; count: number }> = [
        { key: 'dont_follow_back', label: "Don't Follow Back", count: categories.dontFollowBack.length },
        { key: 'not_following_back', label: 'Not Following Back', count: categories.notFollowingBack.length },
        { key: 'mutual', label: 'Mutual', count: categories.mutual.length },
        { key: 'ghost', label: 'Ghost Followers', count: categories.ghost.length },
    ];

    return (
        <section className='flex'>
            <aside className='app-sidebar'>
                <div className='sidebar-stats'>
                    <p>Followers: {followerIds.length}</p>
                    <p>Following: {followingIds.length}</p>
                    <p>Mutual: {categories.mutual.length}</p>
                </div>

                <div className='follower-search'>
                    <input
                        type='text'
                        className='follower-search-input'
                        placeholder='Search users...'
                        value={followerSearchTerm}
                        onChange={e => setState({
                            ...state,
                            followerSearchTerm: e.currentTarget.value,
                            followerPage: 1,
                        })}
                    />
                </div>

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
            </aside>

            <article className='results-container'>
                <nav className='tabs-container'>
                    {tabs.map(t => (
                        <button
                            type='button'
                            key={t.key}
                            className={`tab follower-tab ${followerTab === t.key ? 'tab-active' : ''}`}
                            onClick={() => setTab(t.key)}
                        >
                            {t.label} ({t.count})
                        </button>
                    ))}
                </nav>

                {pageUsers.length === 0 && (
                    <div className='empty-state'>
                        {followerSearchTerm ? 'No results match your search.' : 'No users in this category.'}
                    </div>
                )}

                {pageUsers.map(user => {
                    const likes = likerMap[user.id]?.likesCount ?? 0;
                    return (
                        <div className='leaderboard-entry' key={user.id}>
                            <img
                                className='entry-avatar'
                                alt={user.username}
                                src={user.profile_pic_url}
                                loading='lazy'
                            />
                            <div className='entry-info'>
                                <a
                                    className='entry-username'
                                    target='_blank'
                                    href={`/${user.username}`}
                                    rel='noreferrer'
                                >
                                    {user.username}
                                    {user.is_verified && <span className='verified-badge'>&#10004;</span>}
                                </a>
                                <span className='entry-fullname'>{user.full_name}</span>
                            </div>
                            <div className={`follower-likes-info ${likes === 0 ? 'follower-likes-empty' : ''}`}>
                                {likes} likes
                            </div>
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
