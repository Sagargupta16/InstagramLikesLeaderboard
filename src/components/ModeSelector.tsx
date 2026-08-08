import React, { useEffect, useState } from 'react';
import { ScanModes, DEFAULT_SCAN_MODES } from '../model/scan-modes';
import { SavedScan, formatTimeSince } from '../utils/storage';

interface ModeSelectorProps {
    readonly onScan: (modes: ScanModes) => void;
    readonly onLoadPrevious: () => void;
    readonly onDeleteSaved: () => void;
    readonly savedScan: SavedScan | null;
    readonly retryAt: number | null;
}

export const ModeSelector = ({
    onScan,
    onLoadPrevious,
    onDeleteSaved,
    savedScan,
    retryAt,
}: ModeSelectorProps) => {
    const [modes, setModes] = useState(DEFAULT_SCAN_MODES);
    const [now, setNow] = useState(Date.now());

    useEffect(() => {
        if (retryAt === null) {
            return undefined;
        }
        const timer = window.setTimeout(
            () => setNow(Date.now()),
            Math.max(0, retryAt - Date.now()),
        );
        return () => window.clearTimeout(timer);
    }, [retryAt]);

    const retryBlocked = retryAt !== null && retryAt > now;

    return (
        <main className='mode-selector'>
            <h1 className='mode-selector-title'>Analyze recent Instagram activity</h1>
            <p className='mode-selector-subtitle'>The likes leaderboard is always included. Add only the optional views you need.</p>

            <div className='mode-options'>
                <label className='mode-option'>
                    <input
                        type='checkbox'
                        checked={modes.dashboard}
                        onChange={() => setModes({ ...modes, dashboard: !modes.dashboard })}
                    />
                    <span className='mode-option-content'>
                        <span className='mode-option-name'>Stats dashboard</span>
                        <span className='mode-option-desc'>Displayed post-like totals and top identified likers</span>
                    </span>
                </label>

                <label className='mode-option'>
                    <input
                        type='checkbox'
                        checked={modes.followerAnalysis}
                        onChange={() => setModes({ ...modes, followerAnalysis: !modes.followerAnalysis })}
                    />
                    <span className='mode-option-content'>
                        <span className='mode-option-name'>Follower comparison</span>
                        <span className='mode-option-desc'>Adds your followers list; off by default to reduce requests</span>
                    </span>
                </label>
            </div>

            <p className='scan-safety-note'>
                Requests are sequential and use fixed conservative pacing. This reduces pressure but cannot guarantee
                avoiding throttling, checkpoints, temporary restrictions, or enforcement.
            </p>

            {retryBlocked && (
                <p className='retry-lock' role='status'>
                    Instagram requested a cooldown. Start is locked until {new Date(retryAt).toLocaleTimeString()}.
                </p>
            )}

            <button
                type='button'
                className='run-scan-btn'
                onClick={() => onScan(modes)}
                disabled={retryBlocked}
            >
                Start scan
            </button>

            {savedScan && (
                <div className='saved-scan-actions'>
                    <button type='button' className='load-previous-btn' onClick={onLoadPrevious}>
                        Load saved scan ({savedScan.posts.length} posts, {formatTimeSince(savedScan.timestamp)})
                    </button>
                    <button type='button' className='text-button danger-text' onClick={onDeleteSaved}>
                        Delete saved scan
                    </button>
                </div>
            )}
        </main>
    );
};
