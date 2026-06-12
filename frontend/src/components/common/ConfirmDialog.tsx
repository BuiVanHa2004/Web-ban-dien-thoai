'use client';

import React from 'react';
import { AlertCircle, CheckCircle, XCircle, Edit, RotateCcw, Trash2 } from 'lucide-react';

interface ConfirmDialogProps {
    isOpen: boolean;
    title: string;
    message: string;
    type?: 'confirm' | 'success' | 'error' | 'edit' | 'recall' | 'delete';
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
    confirmText = 'Đồng ý',
    cancelText = 'Hủy',
    onConfirm,
    onCancel,
}: ConfirmDialogProps) {
    if (!isOpen) return null;

    const getIconAndColor = () => {
        switch (type) {
            case 'success':
                return {
                    icon: <CheckCircle className="w-12 h-12" />,
                    bgColor: 'bg-gradient-to-br from-green-400 to-emerald-500',
                    textColor: 'text-white',
                    borderColor: 'border-green-200',
                };
            case 'error':
                return {
                    icon: <XCircle className="w-12 h-12" />,
                    bgColor: 'bg-gradient-to-br from-red-400 to-rose-500',
                    textColor: 'text-white',
                    borderColor: 'border-red-200',
                };
            case 'edit':
                return {
                    icon: <Edit className="w-12 h-12" />,
                    bgColor: 'bg-gradient-to-br from-blue-400 to-indigo-500',
                    textColor: 'text-white',
                    borderColor: 'border-blue-200',
                };
            case 'recall':
                return {
                    icon: <RotateCcw className="w-12 h-12" />,
                    bgColor: 'bg-gradient-to-br from-orange-400 to-amber-500',
                    textColor: 'text-white',
                    borderColor: 'border-orange-200',
                };
            case 'delete':
                return {
                    icon: <Trash2 className="w-12 h-12" />,
                    bgColor: 'bg-gradient-to-br from-red-500 to-pink-600',
                    textColor: 'text-white',
                    borderColor: 'border-red-200',
                };
            default:
                return {
                    icon: <AlertCircle className="w-12 h-12" />,
                    bgColor: 'bg-gradient-to-br from-blue-400 to-cyan-500',
                    textColor: 'text-white',
                    borderColor: 'border-blue-200',
                };
        }
    };

    const { icon, bgColor, textColor, borderColor } = getIconAndColor();

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop with blur */}
            <div 
                className="absolute inset-0 bg-black/60 backdrop-blur-md"
                onClick={onCancel}
            />
            
            {/* Dialog box */}
            <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md animate-scale-in overflow-hidden">
                {/* Header với icon */}
                <div className={`${bgColor} ${textColor} px-8 pt-8 pb-6 text-center relative overflow-hidden`}>
                    {/* Decorative circles */}
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full"></div>
                    <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-white/10 rounded-full"></div>
                    
                    {/* Icon */}
                    <div className="relative flex justify-center mb-4">
                        <div className="bg-white/20 backdrop-blur-sm rounded-full p-4 shadow-lg">
                            {icon}
                        </div>
                    </div>

                    {/* Title */}
                    <h3 className="text-2xl font-bold relative">
                        {title}
                    </h3>
                </div>

                {/* Content */}
                <div className="px-8 py-6">
                    {/* Message */}
                    <p className="text-gray-600 text-center mb-6 text-base leading-relaxed">
                        {message}
                    </p>

                    {/* Buttons */}
                    {type === 'confirm' || type === 'edit' || type === 'recall' || type === 'delete' ? (
                        <div className="flex gap-3">
                            <button
                                onClick={onCancel}
                                className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-all hover:scale-105 active:scale-95"
                            >
                                {cancelText}
                            </button>
                            <button
                                onClick={onConfirm}
                                className={`flex-1 px-6 py-3 ${
                                    type === 'delete' 
                                        ? 'bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700' 
                                        : type === 'recall'
                                        ? 'bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700'
                                        : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700'
                                } text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl hover:scale-105 active:scale-95`}
                            >
                                {confirmText}
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={onCancel}
                            className={`w-full px-6 py-3 ${
                                type === 'success'
                                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700'
                                    : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700'
                            } text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl hover:scale-105 active:scale-95`}
                        >
                            Đóng
                        </button>
                    )}
                </div>
            </div>

            <style jsx>{`
                @keyframes scale-in {
                    from {
                        opacity: 0;
                        transform: scale(0.8) translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1) translateY(0);
                    }
                }
                .animate-scale-in {
                    animation: scale-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                }
            `}</style>
        </div>
    );
}
