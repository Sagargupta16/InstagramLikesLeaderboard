export type UserListScope = 'endpoint_complete' | 'page_limit';

// User node returned from the "likers of a post" endpoint
export interface LikerUserNode {
    readonly id: string;
    readonly username: string;
    readonly full_name: string;
    readonly profile_pic_url: string;
    readonly is_verified: boolean;
}

// Accumulator used during scanning to aggregate likes per user
export interface LikerAccumulator {
    readonly user: LikerUserNode;
    readonly likesCount: number;
}
