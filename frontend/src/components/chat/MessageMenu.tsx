'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Edit, RotateCcw, Trash2, MoreVertical } from 'lucide-react';

interface MessageWrapperProps {
    messageId: number;
    messageType: 'TEXT' | 'IMAGE' | 'FILE' | 'SYSTEM';
    message: string;
    recalled: boolean;
    isOwnMessage: boolean;
    onEdit: (messageId: number, newMessage: string) => void;
    onRecall: (messageId: number) => void;
    onDelete: (messageId: number) => void;
    children: React.ReactNode; // bubble content
}

/**
 * MessageWrapper
 *
 * Cấu trúc render (giống kiểu cũ, bubble không bị co):
 *
 *  <div flex justify-end/start>          ← hàng căn phải/trái
 *    <div relative group>               ← wrapper bubble
 *      [nút 3 chấm absolute ngoài bubble]
 *      {children}                       ← bubble gốc giữ nguyên max-w-[75%]
 *    </div>
 *  </div>
 *  [action bar nếu menu mở — flex justify-end/start]
 *  [edit box nếu đang edit — flex justify-end/start]
 */
export function MessageWrapper({
    messageId,
    messageType,
    message,
    recalled,
    isOwnMessage,
    onEdit,
    onRecall,
    onDelete,
    children,
}: MessageWrapperProps) {
    const [showMenu, setShowMenu] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editedMessage, setEditedMessage] = useState(message);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!showMenu) return;
        const handleOutside = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                setShowMenu(false);
            }
        };
        document.addEventListener('mousedown', handleOutside);
        return () => document.removeEventListener('mousedown', handleOutside);
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

    return (
        <div ref={wrapperRef} className="space-y-1">
            {/* ── Hàng chứa bubble (giống render cũ) ── */}
            <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                {/*
                  * relative + group: để nút 3 chấm absolute hiện khi hover
                  * overflow-visible: bắt buộc để nút -left-8/-right-8 không bị cắt
                */}
                <div className="relative group" style={{ overflow: 'visible' }}>
                    {/* Nút 3 chấm — nằm NGOÀI bubble, phía đối diện */}
                    <button
                        onClick={() => setShowMenu((v) => !v)}
                        className={`
                            absolute top-1 z-20
                            bg-black/50 text-white rounded-full w-6 h-6
                            flex items-center justify-center
                            opacity-0 group-hover:opacity-100
                            transition-opacity shadow-md hover:bg-black/70
                            ${isOwnMessage ? '-left-8' : '-right-8'}
                        `}
                        title="Thao tác"
                    >
                        <MoreVertical className="w-3.5 h-3.5" />
                    </button>

                    {/* Bubble — KHÔNG thay đổi, giữ y chang kiểu cũ */}
                    {children}
                </div>
            </div>

            {/* ── Action bar (bên dưới bubble, không đè) ── */}
            {showMenu && (
                <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                    <div className="bg-gray-900/95 backdrop-blur-xl rounded-full shadow-2xl border border-gray-700 px-1.5 py-1.5 flex gap-1">
                        {messageType === 'TEXT' && !recalled && isOwnMessage && (
                            <button
                                onClick={() => { setIsEditing(true); setShowMenu(false); }}
                                className="w-7 h-7 rounded-full text-white bg-blue-500/20 hover:bg-blue-500 flex items-center justify-center transition-colors"
                                title="Chỉnh sửa"
                            >
                                <Edit className="w-3 h-3" />
                            </button>
                        )}
                        {!recalled && isOwnMessage && (
                            <button
                                onClick={() => { onRecall(messageId); setShowMenu(false); }}
                                className="w-7 h-7 rounded-full text-white bg-orange-500/20 hover:bg-orange-500 flex items-center justify-center transition-colors"
                                title="Thu hồi"
                            >
                                <RotateCcw className="w-3 h-3" />
                            </button>
                        )}
                        <button
                            onClick={() => { onDelete(messageId); setShowMenu(false); }}
                            className="w-7 h-7 rounded-full text-white bg-red-500/20 hover:bg-red-500 flex items-center justify-center transition-colors"
                            title="Xóa"
                        >
                            <Trash2 className="w-3 h-3" />
                        </button>
                    </div>
                </div>
            )}

            {/* ── Edit inline (bên dưới bubble) ── */}
            {isEditing && (
                <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                    <div className="w-full max-w-[80%] space-y-2">
                        <textarea
                            value={editedMessage}
                            onChange={(e) => setEditedMessage(e.target.value)}
                            className="w-full p-2 border-2 border-blue-400 rounded-lg text-gray-900 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                            rows={3}
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEditConfirm(); }
                                if (e.key === 'Escape') handleEditCancel();
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
                </div>
            )}
        </div>
    );
}

export default function MessageMenu() { return null; }
