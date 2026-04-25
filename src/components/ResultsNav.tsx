import React from 'react';
import { ResultsView } from '../model/results-view';
import { ScanModes } from '../model/scan-modes';

interface ResultsNavProps {
    currentView: ResultsView;
    scanModes: ScanModes;
    onViewChange: (view: ResultsView) => void;
}

export const ResultsNav = ({ currentView, scanModes, onViewChange }: ResultsNavProps) => {
    const views: Array<{ key: ResultsView; label: string; enabled: boolean }> = [
        { key: 'dashboard', label: 'Dashboard', enabled: scanModes.dashboard },
        { key: 'leaderboard', label: 'Leaderboard', enabled: true },
        { key: 'follower_analysis', label: 'Follower Analysis', enabled: scanModes.followerAnalysis },
    ];

    const enabledViews = views.filter(v => v.enabled);

    if (enabledViews.length <= 1) {
        return null;
    }

    return (
        <nav className='results-nav'>
            {enabledViews.map(v => (
                <button
                    type='button'
                    key={v.key}
                    className={`results-nav-item ${currentView === v.key ? 'results-nav-active' : ''}`}
                    onClick={() => onViewChange(v.key)}
                >
                    {v.label}
                </button>
            ))}
        </nav>
    );
};
