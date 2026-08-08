import React, { useEffect, useState } from 'react';
import { ScanModes, DEFAULT_SCAN_MODES } from '../model/scan-modes';
import { SAVED_SCAN_CACHE_TTL_MS } from '../constants/constants';
import { SavedScan, formatTimeSince, isReusableScan } from '../utils/storage';

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

    useEffect(() => {
        if (!savedScan) {
            return undefined;
        }
        const currentTime = Date.now();
        const expiresIn = savedScan.timestamp + SAVED_SCAN_CACHE_TTL_MS - currentTime;
        if (savedScan.timestamp > currentTime || expiresIn <= 0) {
            return undefined;
        }
        const timer = window.setTimeout(() => setNow(Date.now()), expiresIn);
        return () => window.clearTimeout(timer);
    }, [savedScan]);

    const retryBlocked = retryAt !== null && retryAt > now;
    const reusableSavedScan = savedScan !== null && isReusableScan(savedScan, modes, now);

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
                A compatible completed scan is reused for 24 hours without Instagram requests. Delete the saved copy
                to refresh sooner.
            </p>

            {retryBlocked && (
                <p className='retry-lock' role='status'>
                    Instagram requested a cooldown. New requests are locked until {new Date(retryAt).toLocaleTimeString()}.
                </p>
            )}

            <button
                type='button'
                className='run-scan-btn'
                onClick={() => onScan(modes)}
                disabled={retryBlocked && !reusableSavedScan}
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
