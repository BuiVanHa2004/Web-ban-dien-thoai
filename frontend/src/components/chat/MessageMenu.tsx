'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Edit, RotateCcw, Trash2, MoreVertical } from 'lucide-react';

interface MessageMenuProps {
    messageId: number;
    messageType: 'TEXT' | 'IMAGE' | 'FILE' | 'SYSTEM';
    message: string;
    recalled: boolean;
    isOwnMessage: boolean;
    onEdit: (messageId: number, newMessage: string) => void;
    onRecall: (messageId: number) => void;
    onDelete: (messageId: number) => void;
}

export default function MessageMenu({
    messageId,
    messageType,
    message,
    recalled,
    isOwnMessage,
    onEdit,
    onRecall,
    onDelete,
}: MessageMenuProps) {
    const [showMenu, setShowMenu] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editedMessage, setEditedMessage] = useState(message);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowMenu(false);
            }
        };

        if (showMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showMenu]);

    const handleEditConfirm = () => {
        if (editedMessage.trim() && editedMessage !== message) {
            onEdit(messageId, editedMessage.trim());
            setIsEditing(false);
            setShowMenu(false);
        }
    };

    const handleEditCancel = () => {
        setEditedMessage(message);
        setIsEditing(false);
    };

    const handleRecall = () => {
        onRecall(messageId);
        setShowMenu(false);
    };

    const handleDelete = () => {
        onDelete(messageId);
        setShowMenu(false);
    };

    // If editing mode is active
    if (isEditing) {
        return (
            <div className="mt-2 space-y-2">
                <textarea
                    value={editedMessage}
                    onChange={(e) => setEditedMessage(e.target.value)}
                    className="w-full p-2 border-2 border-blue-400 rounded-lg text-gray-900 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    autoFocus
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleEditConfirm();
                        }
                        if (e.key === 'Escape') {
                            handleEditCancel();
                        }
                    }}
                />
                <div className="flex gap-2">
                    <button
                        onClick={handleEditConfirm}
                        disabled={!editedMessage.trim() || editedMessage === message}
                        className="px-4 py-2 bg-blue-500 text-white text-sm font-semibold rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                    >
                        ✓ Lưu
                    </button>
                    <button
                        onClick={handleEditCancel}
                        className="px-4 py-2 bg-gray-500 text-white text-sm font-semibold rounded-lg hover:bg-gray-600 shadow-md"
                    >
                        ✕ Hủy
                    </button>
                </div>
            </div>
        );
    }

    // Don't show menu for other people's messages
    // REMOVED: Now everyone can see menu on all messages
    // if (!isOwnMessage) {
    //     return null;
    // }

    // For all messages (normal and recalled), show menu button
    return (
        <div ref={menuRef} className="absolute -top-1 -right-1 z-10">
            <button
                onClick={() => setShowMenu(!showMenu)}
                className="bg-black/50 backdrop-blur-sm text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg hover:bg-black/70"
                title="Thao tác"
            >
                <MoreVertical className="w-3.5 h-3.5" />
            </button>

            {showMenu && (
                <div className="absolute right-0 bottom-full mb-2 bg-gray-900/95 backdrop-blur-xl rounded-full shadow-2xl border border-gray-700 px-1.5 py-1.5 flex gap-1 z-20">
                    {/* EDIT */}
                    {messageType === 'TEXT' && !recalled && isOwnMessage && (
                        <button
                            onClick={() => {
                                setIsEditing(true);
                                setShowMenu(false);
                            }}
                            className="w-7 h-7 rounded-full text-white bg-blue-500/20 hover:bg-blue-500 flex items-center justify-center transition-colors"
                            title="Chỉnh sửa"
                        >
                            <Edit className="w-3 h-3" />
                        </button>
                    )}

                    {/* RECALL */}
                    {!recalled && isOwnMessage && (
                        <button
                            onClick={handleRecall}
                            className="w-7 h-7 rounded-full text-white bg-orange-500/20 hover:bg-orange-500 flex items-center justify-center transition-colors"
                            title="Thu hồi"
                        >
                            <RotateCcw className="w-3 h-3" />
                        </button>
                    )}

                    {/* DELETE */}
                    <button
                        onClick={handleDelete}
                        className="w-7 h-7 rounded-full text-white bg-red-500/20 hover:bg-red-500 flex items-center justify-center transition-colors"
                        title="Xóa"
                    >
                        <Trash2 className="w-3 h-3" />
                    </button>
                </div>
            )}
        </div>
    );
}
