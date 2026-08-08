export interface ScanModes {
    readonly followerAnalysis: boolean;
    readonly dashboard: boolean;
}

export const DEFAULT_SCAN_MODES: ScanModes = {
    followerAnalysis: false,
    dashboard: true,
};
