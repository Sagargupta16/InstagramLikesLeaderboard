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
        }
    })();

    const getPhaseClass = (phaseTarget: string): string => {
        const phases = ['fetching_posts', 'fetching_likes', 'fetching_following'];
        const currentIdx = phases.indexOf(state.phase);
        const targetIdx = phases.indexOf(phaseTarget);

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
                    <span className={getPhaseClass('fetching_posts')}>1. Posts</span>
                    <span className={getPhaseClass('fetching_likes')}>2. Likes</span>
                    <span className={getPhaseClass('fetching_following')}>3. Following</span>
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
