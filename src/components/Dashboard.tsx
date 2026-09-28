import React, { useMemo } from 'react';
import { State } from '../model/state';
import { DEFAULT_AUDIENCE_FILTERS } from '../model/audience-filters';
import { TrophyIcon } from './icons/TrophyIcon';
import { FilterPanel } from './FilterPanel';
import { CAPTION_PREVIEW_LENGTH } from '../constants/constants';
import { countActiveFilters, matchesAccountFilters, matchesLikesFilter } from '../utils/utils';

type ResultsState = Extract<State, { status: 'results' }>;

interface DashboardProps {
    readonly state: ResultsState;
    readonly setState: (state: State) => void;
}

const TOP_COUNTS = [5, 10, 25, 50];

interface AudienceRow {
    readonly label: string;
    readonly count: number;
}

export const Dashboard = ({ state, setState }: DashboardProps) => {
    const { filters, hiddenUsers, followerScope, dashboardAudience, dashboardTopCount } = state;
    const hasFollowerData = followerScope !== null;
    const caption = state.mostLikedPost?.edge_media_to_caption.edges[0]?.node.text;

    const likers = useMemo(
        () => [...state.followingLeaderboard, ...state.notFollowingLeaderboard].filter(entry => entry.likesCount > 0),
        [state.followingLeaderboard, state.notFollowingLeaderboard],
    );

    const { matchingLikers, followerSet, followingSet } = useMemo(() => {
        const hiddenSet = new Set(hiddenUsers);
        const followers = new Set(state.followerIds);
        const followsYou = hasFollowerData ? filters.followsYou : 'all';
        return {
            followerSet: followers,
            followingSet: new Set(state.followingIds),
            matchingLikers: likers.filter(entry => matchesAccountFilters(entry.user, filters, hiddenSet)
                && matchesLikesFilter(entry.likesCount, filters.likes)
                && (followsYou === 'all' || (followsYou === 'yes') === followers.has(entry.user.id))),
        };
    }, [likers, filters, hiddenUsers, state.followerIds, state.followingIds, hasFollowerData]);

    const topLikers = useMemo(
        () => matchingLikers
            .filter(entry => dashboardAudience === 'everyone' || followingSet.has(entry.user.id))
            .sort((a, b) => b.likesCount - a.likesCount)
            .slice(0, dashboardTopCount),
        [matchingLikers, dashboardAudience, followingSet, dashboardTopCount],
    );

    const audienceRows = useMemo<AudienceRow[]>(() => {
        const count = (predicate: (id: string) => boolean) =>
            matchingLikers.filter(entry => predicate(entry.user.id)).length;
        const regularThreshold = Math.max(2, Math.ceil(state.totalPostsScanned / 2));
        const rows: AudienceRow[] = [
            { label: 'You follow them', count: count(id => followingSet.has(id)) },
        ];
        if (hasFollowerData) {
            rows.push(
                { label: 'They follow you', count: count(id => followerSet.has(id)) },
                { label: 'Mutual', count: count(id => followerSet.has(id) && followingSet.has(id)) },
            );
        }
        if (matchingLikers.some(entry => entry.user.is_private !== undefined)) {
            rows.push({ label: 'Private accounts', count: matchingLikers.filter(entry => entry.user.is_private).length });
        }
        rows.push(
            { label: 'Verified accounts', count: matchingLikers.filter(entry => entry.user.is_verified).length },
            {
                label: `Regulars (${regularThreshold}+ likes)`,
                count: matchingLikers.filter(entry => entry.likesCount >= regularThreshold).length,
            },
            { label: 'One-time likers', count: matchingLikers.filter(entry => entry.likesCount === 1).length },
        );
        return rows;
    }, [matchingLikers, followerSet, followingSet, hasFollowerData, state.totalPostsScanned]);

    const activeFilters = countActiveFilters(
        { ...filters, followsYou: hasFollowerData ? filters.followsYou : 'all' },
        hiddenUsers.length,
    );

    return (
        <main className='dashboard'>
            <div className='dashboard-grid'>
                <div className='stat-card'>
                    <span className='stat-value'>{state.totalPostsScanned}</span>
                    <span className='stat-label'>Posts scanned</span>
                </div>
                <div className='stat-card'>
                    <span className='stat-value'>{state.totalLikes.toLocaleString()}</span>
                    <span className='stat-label'>Displayed post likes</span>
                </div>
                <div className='stat-card'>
                    <span className='stat-value'>{state.averageLikesPerPost.toFixed(1)}</span>
                    <span className='stat-label'>Average displayed likes</span>
                </div>
                <div className='stat-card'>
                    <span className='stat-value'>{state.totalUniqueLikers}</span>
                    <span className='stat-label'>Identified likers</span>
                </div>
                {state.scanModes.followerAnalysis && (
                    <>
                        <div className='stat-card'>
                            <span className='stat-value'>{state.followerIds.length.toLocaleString()}</span>
                            <span className='stat-label'>Followers returned</span>
                        </div>
                        <div className='stat-card'>
                            <span className='stat-value'>{state.followingIds.length.toLocaleString()}</span>
                            <span className='stat-label'>Following returned</span>
                        </div>
                    </>
                )}
            </div>

            {state.mostLikedPost && (
                <section className='dashboard-section'>
                    <h2>Highest displayed like count</h2>
                    <div className='most-liked-card'>
                        <span className='most-liked-likes'>
                            {state.mostLikedPost.edge_media_preview_like.count.toLocaleString()} likes
                        </span>
                        {caption && (
                            <p className='most-liked-caption'>
                                {caption.substring(0, CAPTION_PREVIEW_LENGTH)}
                                {caption.length > CAPTION_PREVIEW_LENGTH ? '...' : ''}
                            </p>
                        )}
                    </div>
                </section>
            )}

            <details className='filter-drawer' open={activeFilters > 0}>
                <summary>
                    Filters
                    {activeFilters > 0 && <span className='filter-count'>{activeFilters}</span>}
                    <span className='filter-drawer-hint'>Shared with Leaderboard and Follower Analysis</span>
                </summary>
                <FilterPanel
                    filters={filters}
                    hiddenCount={hiddenUsers.length}
                    users={likers.map(entry => entry.user)}
                    totalPosts={state.totalPostsScanned}
                    showFollowsYou={hasFollowerData}
                    showLikes
                    onChange={next => setState({ ...state, filters: next, page: 1, followerPage: 1 })}
                    onUnhideAll={() => setState({ ...state, hiddenUsers: [] })}
                    onReset={() => setState({ ...state, filters: DEFAULT_AUDIENCE_FILTERS, hiddenUsers: [] })}
                />
            </details>

            <section className='dashboard-section'>
                <h2>
                    Audience of identified likers
                    <span className='section-count'>
                        {matchingLikers.length.toLocaleString()}
                        {matchingLikers.length !== likers.length && ` of ${likers.length.toLocaleString()}`}
                    </span>
                </h2>
                {matchingLikers.length === 0
                    ? <div className='empty-state'>No identified likers match the current filters.</div>
                    : (
                        <div className='audience-bars'>
                            {audienceRows.map(row => {
                                const share = Math.round((row.count / matchingLikers.length) * 100);
                                return (
                                    <div className='audience-row' key={row.label}>
                                        <span className='audience-label'>{row.label}</span>
                                        <div className='audience-track'>
                                            <div className='audience-fill' style={{ width: `${share}%` }} />
                                        </div>
                                        <span className='audience-value'>{row.count.toLocaleString()} ({share}%)</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
            </section>

            <section className='dashboard-section'>
                <div className='section-header'>
                    <h2>Top identified likers</h2>
                    <div className='section-controls'>
                        <div className='segmented' role='group' aria-label='Top likers audience'>
                            {(['following', 'everyone'] as const).map(audience => (
                                <button
                                    type='button'
                                    key={audience}
                                    className={`segment ${dashboardAudience === audience ? 'segment-active' : ''}`}
                                    aria-pressed={dashboardAudience === audience}
                                    onClick={() => setState({ ...state, dashboardAudience: audience })}
                                >
                                    {audience === 'following' ? 'You follow' : 'Everyone'}
                                </button>
                            ))}
                        </div>
                        <select
                            className='filter-select'
                            aria-label='Number of top likers'
                            value={dashboardTopCount}
                            onChange={event => setState({ ...state, dashboardTopCount: Number(event.currentTarget.value) })}
                        >
                            {TOP_COUNTS.map(count => <option key={count} value={count}>Top {count}</option>)}
                        </select>
                    </div>
                </div>
                {topLikers.length === 0 && (
                    <div className='empty-state'>No identified likers match the current filters.</div>
                )}
                <div className='top-fans'>
                    {topLikers.map((entry, index) => (
                        <div className='top-fan-entry' key={entry.user.id}>
                            <div className={`top-fan-rank ${index < 3 ? `rank-${index + 1}` : ''}`}>
                                {index < 3 ? <TrophyIcon rank={index + 1} /> : `#${index + 1}`}
                            </div>
                            <img
                                className='top-fan-avatar'
                                alt=''
                                src={entry.user.profile_pic_url}
                                loading='lazy'
                            />
                            <div className='top-fan-info'>
                                <a
                                    className='top-fan-username'
                                    target='_blank'
                                    href={`/${entry.user.username}`}
                                    rel='noopener noreferrer'
                                >
                                    {entry.user.username}
                                    {entry.user.is_verified && <span className='verified-badge'>&#10004;</span>}
                                </a>
                                <span className='top-fan-detail'>
                                    {entry.likesCount}/{entry.totalPosts} scanned posts ({entry.percentage}%)
                                    {dashboardAudience === 'everyone' && !followingSet.has(entry.user.id) && (
                                        <span className='top-fan-tag'>You do not follow</span>
                                    )}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </main>
    );
};
