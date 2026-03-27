import React from 'react';
import './CustomModal.css';

const CustomModal = ({ show, title, message, type = 'info', onConfirm, onClose }) => {
    if (!show) return null;

    const getIcon = () => {
        switch (type) {
            case 'success': return '✓';
            case 'error': return '✕';
            case 'warning': return '⚠';
            default: return 'ℹ';
        }
    };

    const getIconBg = () => {
        switch (type) {
            case 'success': return '#d4edda';
            case 'error': return '#f8d7da';
            case 'warning': return '#fff3cd';
            default: return '#d1ecf1';
        }
    };

    const getButtonColor = () => {
        switch (type) {
            case 'success': return '#4CAF50';
            case 'error': return '#f44336';
            case 'warning': return '#ff9800';
            default: return '#2196F3';
        }
    };

    return (
        <div className="custom-modal-overlay">
            <div className="custom-modal-content">
                {/* Icon */}
                <div className="custom-modal-icon" style={{ background: getIconBg() }}>
                    {getIcon()}
                </div>

                {/* Title */}
                <h3 className="custom-modal-title">{title}</h3>

                {/* Message */}
                <p className="custom-modal-message">{message}</p>

                {/* Buttons */}
                <div className="custom-modal-buttons">
                    {onConfirm ? (
                        <>
                            <button
                                className="custom-modal-btn custom-modal-btn-confirm"
                                onClick={onConfirm}
                                style={{ background: type === 'warning' ? '#ff9800' : '#4CAF50' }}
                            >
                                Continue
                            </button>
                            <button
                                className="custom-modal-btn custom-modal-btn-cancel"
                                onClick={onClose}
                            >
                                Cancel
                            </button>
                        </>
                    ) : (
                        <button
                            className="custom-modal-btn custom-modal-btn-ok"
                            onClick={onClose}
                            style={{ background: getButtonColor() }}
                        >
                            OK
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CustomModal;
