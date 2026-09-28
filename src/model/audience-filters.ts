export type AccountPrivacy = 'all' | 'public' | 'private';
export type FollowsYouFilter = 'all' | 'yes' | 'no';
// 'none' keeps accounts without identified likes; a number is a minimum like count.
export type LikesFilter = 'any' | 'none' | number;

export interface AudienceFilters {
    readonly hideVerified: boolean;
    readonly privacy: AccountPrivacy;
    readonly hideNoProfilePicture: boolean;
    readonly followsYou: FollowsYouFilter;
    readonly likes: LikesFilter;
}

export const DEFAULT_AUDIENCE_FILTERS: AudienceFilters = {
    hideVerified: false,
    privacy: 'all',
    hideNoProfilePicture: false,
    followsYou: 'all',
    likes: 'any',
};
