import React from 'react';
import { AccountPrivacy, AudienceFilters, FollowsYouFilter, LikesFilter } from '../model/audience-filters';
import { LikerUserNode } from '../model/user';
import { countActiveFilters } from '../utils/utils';

interface FilterPanelProps {
    readonly filters: AudienceFilters;
    readonly hiddenCount: number;
    readonly users: readonly LikerUserNode[];
    readonly totalPosts: number;
    readonly showFollowsYou: boolean;
    readonly showLikes: boolean;
    readonly onChange: (filters: AudienceFilters) => void;
    readonly onUnhideAll: () => void;
    readonly onReset: () => void;
}

interface SegmentOption<T extends string> {
    readonly value: T;
    readonly label: string;
}

interface SegmentedProps<T extends string> {
    readonly label: string;
    readonly value: T;
    readonly options: ReadonlyArray<SegmentOption<T>>;
    readonly disabled?: boolean;
    readonly onChange: (value: T) => void;
}

const Segmented = <T extends string>({ label, value, options, disabled, onChange }: SegmentedProps<T>) => (
    <div className='filter-field'>
        <span className='filter-label'>{label}</span>
        <div className='segmented' role='group' aria-label={label}>
            {options.map(option => (
                <button
                    type='button'
                    key={option.value}
                    className={`segment ${value === option.value ? 'segment-active' : ''}`}
                    aria-pressed={value === option.value}
                    disabled={disabled}
                    onClick={() => onChange(option.value)}
                >
                    {option.label}
                </button>
            ))}
        </div>
    </div>
);

interface SwitchProps {
    readonly label: string;
    readonly checked: boolean;
    readonly disabled?: boolean;
    readonly onChange: () => void;
}

const Switch = ({ label, checked, disabled, onChange }: SwitchProps) => (
    <label className={`filter-switch ${disabled ? 'filter-disabled' : ''}`}>
        <input type='checkbox' role='switch' checked={checked} disabled={disabled} onChange={onChange} />
        <span className='switch-track' aria-hidden='true'><span className='switch-thumb' /></span>
        <span>{label}</span>
    </label>
);

const PRIVACY_OPTIONS: ReadonlyArray<SegmentOption<AccountPrivacy>> = [
    { value: 'all', label: 'All' },
    { value: 'public', label: 'Public' },
    { value: 'private', label: 'Private' },
];

const FOLLOWS_YOU_OPTIONS: ReadonlyArray<SegmentOption<FollowsYouFilter>> = [
    { value: 'all', label: 'All' },
    { value: 'yes', label: 'Yes' },
    { value: 'no', label: 'No' },
];

function likesOptions(totalPosts: number): Array<{ value: string; label: string }> {
    const thresholds = new Map<number, string>();
    for (const count of [1, 2, 3, 5, 10, 25, 50, 100]) {
        if (count <= totalPosts) {
            thresholds.set(count, `${count}+ likes`);
        }
    }
    for (const share of [25, 50, 75]) {
        const count = Math.ceil((totalPosts * share) / 100);
        if (count > 1) {
            thresholds.set(count, `${share}%+ of posts (${count}+)`);
        }
    }
    return [
        { value: 'any', label: 'Any' },
        { value: 'none', label: 'No identified likes' },
        ...[...thresholds.entries()]
            .sort(([a], [b]) => a - b)
            .map(([count, label]) => ({ value: String(count), label })),
    ];
}

function parseLikesFilter(value: string): LikesFilter {
    return value === 'any' || value === 'none' ? value : Number(value);
}

export const FilterPanel = ({
    filters,
    hiddenCount,
    users,
    totalPosts,
    showFollowsYou,
    showLikes,
    onChange,
    onUnhideAll,
    onReset,
}: FilterPanelProps) => {
    const privacyKnown = users.some(user => user.is_private !== undefined);
    const pictureKnown = users.some(user => user.has_anonymous_profile_picture !== undefined);
    const activeCount = countActiveFilters(
        { ...filters, followsYou: showFollowsYou ? filters.followsYou : 'all', likes: showLikes ? filters.likes : 'any' },
        hiddenCount,
    );
    const update = (patch: Partial<AudienceFilters>) => onChange({ ...filters, ...patch });

    return (
        <div className='filter-controls'>
            <div className='filter-heading'>
                <p>Filters{activeCount > 0 && <span className='filter-count'>{activeCount}</span>}</p>
                {activeCount > 0 && (
                    <button type='button' className='filter-reset' onClick={onReset}>
                        Reset
                    </button>
                )}
            </div>

            <Switch
                label='Hide verified accounts'
                checked={filters.hideVerified}
                onChange={() => update({ hideVerified: !filters.hideVerified })}
            />
            <Switch
                label={pictureKnown ? 'Hide accounts without a profile photo' : 'Hide no-photo accounts (rescan needed)'}
                checked={filters.hideNoProfilePicture}
                disabled={!pictureKnown}
                onChange={() => update({ hideNoProfilePicture: !filters.hideNoProfilePicture })}
            />
            <Segmented
                label={privacyKnown ? 'Account type' : 'Account type (rescan needed)'}
                value={filters.privacy}
                options={PRIVACY_OPTIONS}
                disabled={!privacyKnown}
                onChange={privacy => update({ privacy })}
            />
            {showFollowsYou && (
                <Segmented
                    label='Follows you'
                    value={filters.followsYou}
                    options={FOLLOWS_YOU_OPTIONS}
                    onChange={followsYou => update({ followsYou })}
                />
            )}
            {showLikes && (
                <label className='filter-field'>
                    <span className='filter-label'>Identified likes</span>
                    <select
                        className='filter-select'
                        value={String(filters.likes)}
                        onChange={event => update({ likes: parseLikesFilter(event.currentTarget.value) })}
                    >
                        {likesOptions(totalPosts).map(option => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                    </select>
                </label>
            )}
            {hiddenCount > 0 && (
                <button type='button' className='sort-direction-btn' onClick={onUnhideAll}>
                    Unhide all ({hiddenCount})
                </button>
            )}
        </div>
    );
};
