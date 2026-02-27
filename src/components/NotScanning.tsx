import React from 'react';

interface NotScanningProps {
    onScan?: () => void;
}

export const NotScanning = ({ onScan }: NotScanningProps) => (
    <button className='run-scan' onClick={onScan}>
        RUN
    </button>
);
