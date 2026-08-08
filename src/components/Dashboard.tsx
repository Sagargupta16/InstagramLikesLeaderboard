import React from 'react';
import { State } from '../model/state';
import { TrophyIcon } from './icons/TrophyIcon';
import { CAPTION_PREVIEW_LENGTH } from '../constants/constants';

interface DashboardProps {
    readonly state: Extract<State, { status: 'results' }>;
}

export const Dashboard = ({ state }: DashboardProps) => {
    const caption = state.mostLikedPost?.edge_media_to_caption.edges[0]?.node.text;
    const topLikers = state.followingLeaderboard
        .filter(entry => entry.likesCount > 0)
        .slice(0, 5);

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

            {topLikers.length > 0 && (
                <section className='dashboard-section'>
                    <h2>Top identified likers you follow</h2>
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
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </main>
    );
};
