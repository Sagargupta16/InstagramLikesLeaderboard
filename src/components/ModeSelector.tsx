import React, { useState } from 'react';
import { ScanModes, DEFAULT_SCAN_MODES } from '../model/scan-modes';
import { SavedScan, formatTimeSince } from '../utils/storage';

interface ModeSelectorProps {
    onScan: (modes: ScanModes) => void;
    onLoadPrevious: () => void;
    savedScan: SavedScan | null;
}

export const ModeSelector = ({ onScan, onLoadPrevious, savedScan }: ModeSelectorProps) => {
    const [modes, setModes] = useState<ScanModes>(DEFAULT_SCAN_MODES);

    return (
        <div className='mode-selector'>
            <h2 className='mode-selector-title'>Choose Analysis Modes</h2>
            <p className='mode-selector-subtitle'>Select what to analyze, then hit RUN</p>

            <div className='mode-options'>
                <label className='mode-option mode-option-locked'>
                    <input type='checkbox' checked disabled />
                    <div className='mode-option-content'>
                        <span className='mode-option-name'>Likes Leaderboard</span>
                        <span className='mode-option-desc'>Ranked list of who likes your posts the most</span>
                    </div>
                </label>

                <label className='mode-option'>
                    <input
                        type='checkbox'
                        checked={modes.dashboard}
                        onChange={() => setModes({ ...modes, dashboard: !modes.dashboard })}
                    />
                    <div className='mode-option-content'>
                        <span className='mode-option-name'>Stats Dashboard</span>
                        <span className='mode-option-desc'>Engagement metrics, top fans, post stats</span>
                    </div>
                </label>

                <label className='mode-option'>
                    <input
                        type='checkbox'
                        checked={modes.followerAnalysis}
                        onChange={() => setModes({ ...modes, followerAnalysis: !modes.followerAnalysis })}
                    />
                    <div className='mode-option-content'>
                        <span className='mode-option-name'>Follower Analysis</span>
                        <span className='mode-option-desc'>Who doesn't follow back, ghost followers, mutuals</span>
                    </div>
                </label>
            </div>

            <button className='run-scan-btn' onClick={() => onScan(modes)}>RUN</button>

            {savedScan && (
                <button className='load-previous-btn' onClick={onLoadPrevious}>
                    Load previous results ({savedScan.totalPostsScanned} posts, {formatTimeSince(savedScan.timestamp)})
                </button>
            )}
        </div>
    );
};
