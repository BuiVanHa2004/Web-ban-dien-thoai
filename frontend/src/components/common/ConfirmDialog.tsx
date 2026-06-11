'use client';

import React from 'react';
import { AlertCircle, CheckCircle, X } from 'lucide-react';

interface ConfirmDialogProps {
    isOpen: boolean;
    title: string;
    message: string;
    type?: 'confirm' | 'success' | 'error';
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
}

export default function ConfirmDialog({
    isOpen,
    title,
    message,
    type = 'confirm',
    confirmText = 'Xác nhận',
    cancelText = 'Hủy',
    onConfirm,
    onCancel,
}: ConfirmDialogProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
            {/* Backdrop mờ */}
            <div 
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onCancel}
            />
            
            {/* Dialog box */}
            <div className="relative bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4 animate-scale-in border-2 border-gray-100">
                {/* Close button */}
                <button
                    onClick={onCancel}
                    className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 transition-colors hover:bg-gray-100 rounded-full p-1"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Icon */}
                <div className="flex justify-center mb-4">
                    {type === 'success' ? (
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                            <CheckCircle className="w-10 h-10 text-green-600" />
                        </div>
                    ) : type === 'error' ? (
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                            <X className="w-10 h-10 text-red-600" />
                        </div>
                    ) : (
                        <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
                            <AlertCircle className="w-10 h-10 text-orange-600" />
                        </div>
                    )}
                </div>

                {/* Title */}
                <h3 className="text-2xl font-bold text-gray-900 text-center mb-3">
                    {title}
                </h3>

                {/* Message */}
                <p className="text-gray-700 text-center mb-6 text-base leading-relaxed font-medium">
                    {message}
                </p>

                {/* Buttons */}
                {type === 'confirm' ? (
                    <div className="flex gap-3">
                        <button
                            onClick={onCancel}
                            className="flex-1 px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-semibold transition-colors text-base"
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={onConfirm}
                            className="flex-1 px-5 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold transition-colors shadow-lg text-base"
                        >
                            {confirmText}
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={onCancel}
                        className="w-full px-5 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl font-semibold transition-colors shadow-lg text-base"
                    >
                        Đóng
                    </button>
                )}
            </div>

            <style jsx>{`
                @keyframes scale-in {
                    from {
                        opacity: 0;
                        transform: scale(0.9);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1);
                    }
                }
                .animate-scale-in {
                    animation: scale-in 0.2s ease-out;
                }
            `}</style>
        </div>
    );
}
