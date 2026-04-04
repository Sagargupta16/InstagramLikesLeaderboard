import React from 'react';
import { State } from '../model/state';

interface ScanningProps {
    state: State;
    scanningPaused: boolean;
    pauseScan: () => void;
}

export const Scanning = ({ state, scanningPaused, pauseScan }: ScanningProps) => {
    if (state.status !== 'scanning') {
        return null;
    }

    const phaseLabel = (() => {
        switch (state.phase) {
            case 'fetching_posts':
                return `Fetching posts... (${state.posts.length}/${state.totalPostCount > 0 ? state.totalPostCount : '?'})`;
            case 'fetching_likes':
                return `Fetching likes... (Post ${state.currentPostIndex}/${state.posts.length})`;
            case 'fetching_following':
                return `Fetching following list... (${state.followingCount})`;
            case 'fetching_followers':
                return `Fetching followers list... (${state.followerCount})`;
        }
    })();

    const phases: Array<{ key: string; label: string }> = [
        { key: 'fetching_posts', label: '1. Posts' },
        { key: 'fetching_likes', label: '2. Likes' },
        { key: 'fetching_following', label: '3. Following' },
    ];

    if (state.scanModes.followerAnalysis) {
        phases.push({ key: 'fetching_followers', label: '4. Followers' });
    }

    const getPhaseClass = (phaseTarget: string): string => {
        const phaseKeys = phases.map(p => p.key);
        const currentIdx = phaseKeys.indexOf(state.phase);
        const targetIdx = phaseKeys.indexOf(phaseTarget);

        if (targetIdx < currentIdx) {
            return 'completed';
        }
        if (targetIdx === currentIdx) {
            return 'active';
        }
        return '';
    };

    return (
        <section className='scanning-container'>
            <div className='scanning-phase'>
                <div className='phase-indicator'>
                    {phases.map(p => (
                        <span key={p.key} className={getPhaseClass(p.key)}>{p.label}</span>
                    ))}
                </div>
                <h2>{phaseLabel}</h2>
                <progress className='scanning-progress' value={state.percentage} max={100} />
                <div className='scanning-percentage'>{state.percentage}%</div>
                <div className='controls'>
                    <button className='button-control' onClick={pauseScan}>
                        {scanningPaused ? 'Resume' : 'Pause'}
                    </button>
                </div>
                {state.phase === 'fetching_likes' && (
                    <p className='scanning-detail'>
                        Unique likers found: {Object.keys(state.likerMap).length}
                    </p>
                )}
                {state.phase === 'fetching_posts' && state.posts.length > 0 && (
                    <p className='scanning-detail'>
                        Posts collected: {state.posts.length}
                    </p>
                )}
            </div>
        </section>
    );
};
