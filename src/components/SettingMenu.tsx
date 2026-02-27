import React, { useState } from 'react';
import { Timings } from '../model/timings';

interface SettingMenuProps {
    setSettingState: (state: boolean) => void;
    currentTimings: Timings;
    setTimings: (timings: Timings) => void;
}

export const SettingMenu = ({
    setSettingState,
    currentTimings,
    setTimings,
}: SettingMenuProps) => {
    const [timeBetweenPostFetches, setTimeBetweenPostFetches] = useState(currentTimings.timeBetweenPostFetches);
    const [timeToWaitAfterSixPostFetches, setTimeToWaitAfterSixPostFetches] = useState(currentTimings.timeToWaitAfterSixPostFetches);
    const [timeBetweenLikerFetches, setTimeBetweenLikerFetches] = useState(currentTimings.timeBetweenLikerFetches);
    const [timeToWaitAfterFiveLikerFetches, setTimeToWaitAfterFiveLikerFetches] = useState(currentTimings.timeToWaitAfterFiveLikerFetches);
    const [timeBetweenFollowingFetches, setTimeBetweenFollowingFetches] = useState(currentTimings.timeBetweenFollowingFetches);
    const [timeToWaitAfterSixFollowingFetches, setTimeToWaitAfterSixFollowingFetches] = useState(currentTimings.timeToWaitAfterSixFollowingFetches);

    const handleSave = (event: any) => {
        event.preventDefault();
        setTimings({
            timeBetweenPostFetches,
            timeToWaitAfterSixPostFetches,
            timeBetweenLikerFetches,
            timeToWaitAfterFiveLikerFetches,
            timeBetweenFollowingFetches,
            timeToWaitAfterSixFollowingFetches,
        });
        setSettingState(false);
    };

    const handleInputChange = (_event: any, setter: (value: number) => void) => {
        const value = Number(_event?.target?.value);
        setter(value);
    };

    return (
        <form onSubmit={handleSave}>
            <div className='backdrop'>
                <div className='setting-menu'>
                    <div className='settings-module'>
                        <div className='module-header'>
                            <h3>Settings</h3>
                        </div>

                        <div className='settings-content'>
                            <div className='row'>
                                <label className='minimun-width'>Time between post fetches</label>
                                <input
                                    type='number'
                                    min={500}
                                    max={999999}
                                    value={timeBetweenPostFetches}
                                    onChange={e => handleInputChange(e, setTimeBetweenPostFetches)}
                                />
                                <label className='margin-between-input-and-label'>(ms)</label>
                            </div>

                            <div className='row'>
                                <label className='minimun-width'>Sleep after 6 post fetches</label>
                                <input
                                    type='number'
                                    min={4000}
                                    max={999999}
                                    value={timeToWaitAfterSixPostFetches}
                                    onChange={e => handleInputChange(e, setTimeToWaitAfterSixPostFetches)}
                                />
                                <label className='margin-between-input-and-label'>(ms)</label>
                            </div>

                            <div className='row'>
                                <label className='minimun-width'>Time between liker fetches</label>
                                <input
                                    type='number'
                                    min={400}
                                    max={999999}
                                    value={timeBetweenLikerFetches}
                                    onChange={e => handleInputChange(e, setTimeBetweenLikerFetches)}
                                />
                                <label className='margin-between-input-and-label'>(ms)</label>
                            </div>

                            <div className='row'>
                                <label className='minimun-width'>Sleep after 5 liker fetches</label>
                                <input
                                    type='number'
                                    min={4000}
                                    max={999999}
                                    value={timeToWaitAfterFiveLikerFetches}
                                    onChange={e => handleInputChange(e, setTimeToWaitAfterFiveLikerFetches)}
                                />
                                <label className='margin-between-input-and-label'>(ms)</label>
                            </div>

                            <div className='row'>
                                <label className='minimun-width'>Time between following fetches</label>
                                <input
                                    type='number'
                                    min={500}
                                    max={999999}
                                    value={timeBetweenFollowingFetches}
                                    onChange={e => handleInputChange(e, setTimeBetweenFollowingFetches)}
                                />
                                <label className='margin-between-input-and-label'>(ms)</label>
                            </div>

                            <div className='row'>
                                <label className='minimun-width'>Sleep after 6 following fetches</label>
                                <input
                                    type='number'
                                    min={4000}
                                    max={999999}
                                    value={timeToWaitAfterSixFollowingFetches}
                                    onChange={e => handleInputChange(e, setTimeToWaitAfterSixFollowingFetches)}
                                />
                                <label className='margin-between-input-and-label'>(ms)</label>
                            </div>

                            <div className='warning-container'>
                                <h3 className='warning'><b>WARNING:</b> Lowering these values can lead to your account being temporarily blocked.</h3>
                                <h3 className='warning'>USE AT YOUR OWN RISK!</h3>
                            </div>
                        </div>
                    </div>

                    <div className='btn-container'>
                        <button className='btn' type='button' onClick={() => setSettingState(false)}>Cancel</button>
                        <button className='btn' type='submit'>Save</button>
                    </div>
                </div>
            </div>
        </form>
    );
};
