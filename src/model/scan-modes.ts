export interface ScanModes {
    readonly leaderboard: true; // always on
    readonly followerAnalysis: boolean;
    readonly dashboard: boolean;
}

export const DEFAULT_SCAN_MODES: ScanModes = {
    leaderboard: true,
    followerAnalysis: true,
    dashboard: true,
};
