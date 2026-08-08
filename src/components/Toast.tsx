import React from 'react';

interface ToastProps {
    show?: boolean;
    style?: 'success' | 'error' | 'warning' | 'info';
    message: string;
    onClose?: () => void;
}

export const Toast = ({ show = false, style = 'info', message, onClose }: ToastProps) => {
    if (!show) {
        return null;
    }

    const role = style === 'error' || style === 'warning' ? 'alert' : 'status';
    return (
        <div className={`toast ${style}`} role={role}>
            <p className='toast__message'>{message}</p>
            <button
                type='button'
                className='toast__close-button'
                onClick={onClose}
                aria-label='Dismiss message'
            >
                &times;
            </button>
        </div>
    );
};
