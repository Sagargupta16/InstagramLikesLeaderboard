import React from 'react';
import { ScanningPhase, State } from '../model/state';

interface ScanningProps {
    readonly state: Extract<State, { status: 'scanning' }>;
    readonly scanningPaused: boolean;
    readonly pauseScan: () => void;
    readonly stopScan: () => void;
}

export const Scanning = ({ state, scanningPaused, pauseScan, stopScan }: ScanningProps) => {
    const phaseLabel = (() => {
        switch (state.phase) {
            case 'fetching_posts':
                return `Collecting posts (${state.posts.length} found)`;
            case 'fetching_likes':
                return `Collecting identified likers (${state.currentPostIndex}/${state.posts.length} posts)`;
            case 'fetching_following':
                return `Collecting following list (${state.followingCount} found)`;
            case 'fetching_followers':
                return `Collecting followers list (${state.followerCount} found)`;
        }
    })();

    const phases: Array<{ key: ScanningPhase; label: string }> = [
        { key: 'fetching_posts', label: '1. Posts' },
        { key: 'fetching_likes', label: '2. Likers' },
        { key: 'fetching_following', label: '3. Following' },
    ];
    if (state.scanModes.followerAnalysis) {
        phases.push({ key: 'fetching_followers', label: '4. Followers' });
    }

    const currentPhase = phases.findIndex(phase => phase.key === state.phase);

    return (
        <main className='scanning-container' aria-live='polite'>
            <section className='scanning-phase'>
                <ol className='phase-indicator' aria-label='Scan phases'>
                    {phases.map((phase, index) => (
                        <li
                            key={phase.key}
                            className={index < currentPhase ? 'completed' : index === currentPhase ? 'active' : ''}
                            aria-current={index === currentPhase ? 'step' : undefined}
                        >
                            {phase.label}
                        </li>
                    ))}
                </ol>
                <h1>{scanningPaused ? 'Scan paused' : phaseLabel}</h1>
                <progress
                    className='scanning-progress'
                    value={state.percentage === null ? undefined : state.percentage}
                    max={100}
                    aria-label={state.percentage === null ? 'Phase progress unknown' : `${state.percentage}% complete`}
                />
                <div className='scanning-percentage'>
                    {state.percentage === null ? 'In progress' : `${state.percentage}%`}
                </div>
                <div className='controls'>
                    <button
                        type='button'
                        className='button-control'
                        onClick={pauseScan}
                        aria-pressed={scanningPaused}
                    >
                        {scanningPaused ? 'Resume' : 'Pause'}
                    </button>
                    <button type='button' className='button-control button-danger' onClick={stopScan}>
                        Stop
                    </button>
                </div>
                <p className='scanning-detail'>
                    Pause prevents the next request; it does not cancel one already in progress. Stop aborts this run,
                    and partial results are never saved.
                </p>
                {state.phase === 'fetching_likes' && (
                    <p className='scanning-detail'>Identified likers: {state.identifiedLikerCount}</p>
                )}
            </section>
        </main>
    );
};
