export interface PageInfo {
    readonly has_next_page: boolean;
    readonly end_cursor: string;
}

// User node returned from the "likers of a post" endpoint
export interface LikerUserNode {
    readonly id: string;
    readonly username: string;
    readonly full_name: string;
    readonly profile_pic_url: string;
    readonly is_verified: boolean;
    readonly is_private: boolean;
}

// Paginated response for post likers
export interface LikersResponse {
    readonly count: number;
    readonly page_info: PageInfo;
    readonly edges: ReadonlyArray<{ readonly node: LikerUserNode }>;
}

// Accumulator used during scanning to aggregate likes per user
export interface LikerAccumulator {
    readonly user: LikerUserNode;
    readonly likesCount: number;
}

// User node from the "following list" endpoint
export interface FollowingUserNode {
    readonly id: string;
    readonly username: string;
    readonly full_name: string;
    readonly profile_pic_url: string;
    readonly is_private: boolean;
    readonly is_verified: boolean;
    readonly followed_by_viewer: boolean;
    readonly follows_viewer: boolean;
    readonly requested_by_viewer: boolean;
    readonly reel: Reel;
}

// Paginated response for following list
export interface FollowingResponse {
    readonly count: number;
    readonly page_info: PageInfo;
    readonly edges: ReadonlyArray<{ readonly node: FollowingUserNode }>;
}

export interface Reel {
    readonly id: string;
    readonly expiring_at: number;
    readonly has_pride_media: boolean;
    readonly latest_reel_media: number;
    readonly seen: null;
    readonly owner: Owner;
}

export interface Owner {
    readonly __typename: string;
    readonly id: string;
    readonly profile_pic_url: string;
    readonly username: string;
}
