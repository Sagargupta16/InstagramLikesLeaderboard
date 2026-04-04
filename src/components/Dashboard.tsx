import React from 'react';
import { State } from '../model/state';
import { TrophyIcon } from './icons/TrophyIcon';

interface DashboardProps {
    state: State;
}

export const Dashboard = ({ state }: DashboardProps) => {
    if (state.status !== 'results') {
        return null;
    }

    const {
        totalPostsScanned,
        totalUniqueLikers,
        totalLikes,
        averageLikesPerPost,
        mostLikedPost,
        followingLeaderboard,
        followerIds,
        followingIds,
        scanModes,
    } = state;

    const followerCount = followerIds.length;
    const followingCount = followingIds.length;
    const engagementRate = followerCount > 0 && totalPostsScanned > 0
        ? ((totalLikes / totalPostsScanned / followerCount) * 100).toFixed(2)
        : null;

    // Top 5 fans from the following leaderboard
    const topFans = [...followingLeaderboard]
        .sort((a, b) => b.likesCount - a.likesCount)
        .slice(0, 5)
        .filter(e => e.likesCount > 0);

    return (
        <div className='dashboard'>
            <div className='dashboard-grid'>
                {/* Stats cards */}
                <div className='stat-card'>
                    <span className='stat-value'>{totalPostsScanned}</span>
                    <span className='stat-label'>Posts Scanned</span>
                </div>
                <div className='stat-card'>
                    <span className='stat-value'>{totalLikes.toLocaleString()}</span>
                    <span className='stat-label'>Total Likes</span>
                </div>
                <div className='stat-card'>
                    <span className='stat-value'>{averageLikesPerPost.toFixed(1)}</span>
                    <span className='stat-label'>Avg Likes/Post</span>
                </div>
                <div className='stat-card'>
                    <span className='stat-value'>{totalUniqueLikers}</span>
                    <span className='stat-label'>Unique Likers</span>
                </div>
                {scanModes.followerAnalysis && (
                    <>
                        <div className='stat-card'>
                            <span className='stat-value'>{followerCount.toLocaleString()}</span>
                            <span className='stat-label'>Followers</span>
                        </div>
                        <div className='stat-card'>
                            <span className='stat-value'>{followingCount.toLocaleString()}</span>
                            <span className='stat-label'>Following</span>
                        </div>
                        {engagementRate && (
                            <div className='stat-card stat-card-highlight'>
                                <span className='stat-value'>{engagementRate}%</span>
                                <span className='stat-label'>Engagement Rate</span>
                            </div>
                        )}
                        <div className='stat-card'>
                            <span className='stat-value'>
                                {followerCount > 0 ? (followingCount / followerCount).toFixed(2) : '-'}
                            </span>
                            <span className='stat-label'>Following/Follower Ratio</span>
                        </div>
                    </>
                )}
            </div>

            {/* Most liked post */}
            {mostLikedPost && (
                <div className='dashboard-section'>
                    <h3>Most Liked Post</h3>
                    <div className='most-liked-card'>
                        <div className='most-liked-info'>
                            <span className='most-liked-likes'>
                                {mostLikedPost.edge_media_preview_like.count.toLocaleString()} likes
                            </span>
                            {mostLikedPost.edge_media_to_caption.edges.length > 0 && (
                                <p className='most-liked-caption'>
                                    {mostLikedPost.edge_media_to_caption.edges[0].node.text.substring(0, 150)}
                                    {mostLikedPost.edge_media_to_caption.edges[0].node.text.length > 150 ? '...' : ''}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Top 5 fans */}
            {topFans.length > 0 && (
                <div className='dashboard-section'>
                    <h3>Top 5 Fans</h3>
                    <div className='top-fans'>
                        {topFans.map((entry, idx) => (
                            <div className='top-fan-entry' key={entry.user.id}>
                                <div className={`top-fan-rank ${idx < 3 ? `rank-${idx + 1}` : ''}`}>
                                    {idx < 3
                                        ? <TrophyIcon rank={idx + 1} />
                                        : `#${idx + 1}`
                                    }
                                </div>
                                <img
                                    className='top-fan-avatar'
                                    alt={entry.user.username}
                                    src={entry.user.profile_pic_url}
                                />
                                <div className='top-fan-info'>
                                    <a
                                        className='top-fan-username'
                                        target='_blank'
                                        href={`/${entry.user.username}`}
                                        rel='noreferrer'
                                    >
                                        {entry.user.username}
                                        {entry.user.is_verified && <span className='verified-badge'>&#10004;</span>}
                                    </a>
                                    <span className='top-fan-detail'>
                                        {entry.likesCount} likes ({entry.percentage}%)
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
