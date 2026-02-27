import React, { useState } from 'react';
import { State } from '../model/state';
import { assertUnreachable } from '../utils/utils';
import { SettingMenu } from './SettingMenu';
import { SettingIcon } from './icons/SettingIcon';
import { Timings } from '../model/timings';
import { Logo } from './icons/Logo';

interface ToolBarProps {
    isActiveProcess: boolean;
    state: State;
    setState: (state: State) => void;
    currentTimings: Timings;
    setTimings: (timings: Timings) => void;
}

export const Toolbar = ({
    isActiveProcess,
    state,
    setState,
    currentTimings,
    setTimings,
}: ToolBarProps) => {
    const [settingMenu, setSettingMenu] = useState(false);

    return (
        <header className='app-header'>
            {isActiveProcess && (
                <progress
                    className='progressbar'
                    value={state.status !== 'initial' && state.status === 'scanning' ? state.percentage : 0}
                    max={100}
                />
            )}
            <div className='app-header-content'>
                <div
                    className='logo'
                    onClick={() => {
                        if (isActiveProcess) {
                            return;
                        }
                        switch (state.status) {
                            case 'initial':
                                if (confirm('Go back to Instagram?')) {
                                    location.reload();
                                }
                                break;
                            case 'scanning':
                            case 'results':
                                setState({ status: 'initial' });
                                break;
                            default:
                                assertUnreachable(state);
                        }
                    }}
                >
                    <Logo />
                    <div className='logo-text'>
                        <span>Instagram</span>
                        <span>Likes Leaderboard</span>
                    </div>
                </div>

                {state.status === 'initial' && (
                    <SettingIcon onClickLogo={() => { setSettingMenu(true); }} />
                )}

                <input
                    type='text'
                    className='search-bar'
                    placeholder='Search...'
                    disabled={state.status !== 'results'}
                    value={state.status === 'results' ? state.searchTerm : ''}
                    onChange={e => {
                        switch (state.status) {
                            case 'initial':
                            case 'scanning':
                                return;
                            case 'results':
                                return setState({
                                    ...state,
                                    searchTerm: e.currentTarget.value,
                                    page: 1,
                                });
                            default:
                                assertUnreachable(state);
                        }
                    }}
                />
            </div>
            {settingMenu && (
                <SettingMenu
                    setSettingState={setSettingMenu}
                    currentTimings={currentTimings}
                    setTimings={setTimings}
                />
            )}
        </header>
    );
};
