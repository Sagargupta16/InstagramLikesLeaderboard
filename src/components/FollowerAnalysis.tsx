import React, { useMemo } from 'react';
import { State } from '../model/state';
import { FollowerTab } from '../model/follower-tab';
import { LikerUserNode } from '../model/user';
import { LEADERBOARD_ENTRIES_PER_PAGE } from '../constants/constants';
import { getMaxPage } from '../utils/utils';

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

    const filteredUsers = useMemo(() => {
        if (!followerSearchTerm) { return allUsers; }
        const term = followerSearchTerm.toLowerCase();
        return allUsers.filter(u =>
            u.username.toLowerCase().includes(term) ||
            u.full_name.toLowerCase().includes(term),
        );
    }, [allUsers, followerSearchTerm]);

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
