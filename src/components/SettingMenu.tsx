import React, { useState } from 'react';
import { Timings } from '../model/timings';

interface SettingMenuProps {
    setSettingState: (state: boolean) => void;
    currentTimings: Timings;
    setTimings: (timings: Timings) => void;
}

interface TimingField {
    readonly key: keyof Timings;
    readonly label: string;
    readonly min: number;
}

// Order and min values preserved exactly from the original per-input markup.
const TIMING_FIELDS: readonly TimingField[] = [
    { key: 'timeBetweenPostFetches', label: 'Time between post fetches', min: 500 },
    { key: 'timeToWaitAfterSixPostFetches', label: 'Sleep after 6 post fetches', min: 4000 },
    { key: 'timeBetweenLikerFetches', label: 'Time between liker fetches', min: 400 },
    { key: 'timeToWaitAfterFiveLikerFetches', label: 'Sleep after 5 liker fetches', min: 4000 },
    { key: 'timeBetweenFollowingFetches', label: 'Time between following fetches', min: 500 },
    { key: 'timeToWaitAfterSixFollowingFetches', label: 'Sleep after 6 following fetches', min: 4000 },
    { key: 'timeBetweenFollowerFetches', label: 'Time between follower fetches', min: 500 },
    { key: 'timeToWaitAfterSixFollowerFetches', label: 'Sleep after 6 follower fetches', min: 4000 },
];

const INPUT_MAX = 999999;

export const SettingMenu = ({
    setSettingState,
    currentTimings,
    setTimings,
}: SettingMenuProps) => {
    const [draft, setDraft] = useState(currentTimings);

    const handleSave = (event: any) => {
        event.preventDefault();
        setTimings(draft);
        setSettingState(false);
    };

    const handleInputChange = (key: keyof Timings, event: any) => {
        const value = Number(event?.target?.value);
        setDraft(prev => ({ ...prev, [key]: value }));
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
                            {TIMING_FIELDS.map(field => (
                                <div className='row' key={field.key}>
                                    <label className='minimun-width'>{field.label}</label>
                                    <input
                                        type='number'
                                        min={field.min}
                                        max={INPUT_MAX}
                                        value={draft[field.key]}
                                        onChange={e => handleInputChange(field.key, e)}
                                    />
                                    <label className='margin-between-input-and-label'>(ms)</label>
                                </div>
                            ))}

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
