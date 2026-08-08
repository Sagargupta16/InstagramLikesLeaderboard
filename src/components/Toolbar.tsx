import React from 'react';
import { State } from '../model/state';
import { Logo } from './icons/Logo';

interface ToolBarProps {
    readonly state: State;
    readonly hasSavedScan: boolean;
    readonly onHome: () => void;
    readonly onDeleteSaved: () => void;
}

export const Toolbar = ({ state, hasSavedScan, onHome, onDeleteSaved }: ToolBarProps) => (
    <header className='app-header'>
        <div className='app-header-content'>
            <button
                type='button'
                className='logo'
                disabled={state.status === 'scanning'}
                onClick={onHome}
                aria-label={state.status === 'initial' ? 'Return to Instagram' : 'Start page'}
            >
                <Logo />
                <span className='logo-text'>
                    <span>Instagram</span>
                    <span>Likes Leaderboard</span>
                </span>
            </button>
            <div className='header-actions'>
                {state.status === 'results' && (
                    <button type='button' className='header-button' onClick={onHome}>New scan</button>
                )}
                {hasSavedScan && (
                    <button type='button' className='header-button danger-text' onClick={onDeleteSaved}>
                        Delete saved copy
                    </button>
                )}
            </div>
        </div>
    </header>
);
