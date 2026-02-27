import { LikerUserNode } from './user';

export interface LeaderboardEntry {
    readonly user: LikerUserNode;
    readonly likesCount: number;
    readonly totalPosts: number;
    readonly percentage: number;
    readonly rank: number;
}
