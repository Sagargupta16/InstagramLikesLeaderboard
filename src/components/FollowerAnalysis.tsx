import React from 'react';
import { State } from '../model/state';
import { FollowerTab } from '../model/follower-tab';
import { LikerUserNode } from '../model/user';
import { LEADERBOARD_ENTRIES_PER_PAGE } from '../constants/constants';

interface FollowerAnalysisProps {
    state: State;
    setState: (state: State) => void;
}

export const FollowerAnalysis = ({ state, setState }: FollowerAnalysisProps) => {
    if (state.status !== 'results') {
        return null;
    }

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

    const followerSet = new Set(followerIds);
    const followingSet = new Set(followingIds);

    // Compute each category
    const dontFollowBack = followingIds.filter(id => !followerSet.has(id));
    const notFollowingBack = followerIds.filter(id => !followingSet.has(id));
    const mutual = followingIds.filter(id => followerSet.has(id));
    const ghostFollowers = followerIds.filter(id => !likerMap[id]);

    const getUsers = (ids: readonly string[]): LikerUserNode[] =>
        ids.map(id => followerUsers[id] || followingUsers[id]).filter(Boolean);

    let currentIds: readonly string[];
    switch (followerTab) {
        case 'dont_follow_back':
            currentIds = dontFollowBack;
            break;
        case 'not_following_back':
            currentIds = notFollowingBack;
            break;
        case 'mutual':
            currentIds = mutual;
            break;
        case 'ghost':
            currentIds = ghostFollowers;
            break;
    }

    let users = getUsers(currentIds);

    // Search filter
    if (followerSearchTerm) {
        const term = followerSearchTerm.toLowerCase();
        users = users.filter(u =>
            u.username.toLowerCase().includes(term) ||
            u.full_name.toLowerCase().includes(term),
        );
    }

    const totalPages = Math.max(1, Math.ceil(users.length / LEADERBOARD_ENTRIES_PER_PAGE));
    const pageUsers = users.slice(
        (followerPage - 1) * LEADERBOARD_ENTRIES_PER_PAGE,
        followerPage * LEADERBOARD_ENTRIES_PER_PAGE,
    );

    const setTab = (tab: FollowerTab) => {
        if (state.status === 'results') {
            setState({ ...state, followerTab: tab, followerPage: 1, followerSearchTerm: '' });
        }
    };

    const tabs: Array<{ key: FollowerTab; label: string; count: number }> = [
        { key: 'dont_follow_back', label: "Don't Follow Back", count: dontFollowBack.length },
        { key: 'not_following_back', label: 'Not Following Back', count: notFollowingBack.length },
        { key: 'mutual', label: 'Mutual', count: mutual.length },
        { key: 'ghost', label: 'Ghost Followers', count: ghostFollowers.length },
    ];

    return (
        <section className='flex'>
            <aside className='app-sidebar'>
                <div className='sidebar-stats'>
                    <p>Followers: {followerIds.length}</p>
                    <p>Following: {followingIds.length}</p>
                    <p>Mutual: {mutual.length}</p>
                </div>

                <div className='follower-search'>
                    <input
                        type='text'
                        className='follower-search-input'
                        placeholder='Search users...'
                        value={followerSearchTerm}
                        onChange={e => {
                            if (state.status === 'results') {
                                setState({ ...state, followerSearchTerm: e.currentTarget.value, followerPage: 1 });
                            }
                        }}
                    />
                </div>

                <div className='sidebar-pagination'>
                    <p>Pages</p>
                    <div className='pagination-controls'>
                        <a
                            onClick={() => {
                                if (state.status === 'results' && followerPage > 1) {
                                    setState({ ...state, followerPage: followerPage - 1 });
                                }
                            }}
                        >
                            &#10094;
                        </a>
                        <span>{followerPage}&nbsp;/&nbsp;{totalPages}</span>
                        <a
                            onClick={() => {
                                if (state.status === 'results' && followerPage < totalPages) {
                                    setState({ ...state, followerPage: followerPage + 1 });
                                }
                            }}
                        >
                            &#10095;
                        </a>
                    </div>
                </div>
            </aside>

            <article className='results-container'>
                <nav className='tabs-container'>
                    {tabs.map(t => (
                        <div
                            key={t.key}
                            className={`tab follower-tab ${followerTab === t.key ? 'tab-active' : ''}`}
                            onClick={() => setTab(t.key)}
                        >
                            {t.label} ({t.count})
                        </div>
                    ))}
                </nav>

                {pageUsers.length === 0 && (
                    <div className='p-large t-center' style={{ color: '#888' }}>
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
                            <div className='follower-likes-info'>
                                {likes > 0
                                    ? <span className='clr-cyan'>{likes} likes</span>
                                    : <span style={{ color: '#666' }}>0 likes</span>
                                }
                            </div>
                        </div>
                    );
                })}
            </article>
        </section>
    );
};
