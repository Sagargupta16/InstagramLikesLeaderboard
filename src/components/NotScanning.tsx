import React from 'react';
import { ScanModes } from '../model/scan-modes';
import { ModeSelector } from './ModeSelector';
import { SavedScan } from '../utils/storage';

interface NotScanningProps {
    onScan: (modes: ScanModes) => void;
    onLoadPrevious: () => void;
    savedScan: SavedScan | null;
}

export const NotScanning = ({ onScan, onLoadPrevious, savedScan }: NotScanningProps) => (
    <ModeSelector onScan={onScan} onLoadPrevious={onLoadPrevious} savedScan={savedScan} />
);
