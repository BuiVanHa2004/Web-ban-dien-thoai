'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Edit, RotateCcw, Trash2, MoreVertical } from 'lucide-react';

/**
 * MessageActions — component nhỏ gọn, dùng trực tiếp BÊN TRONG message row.
 *
 * Cách dùng trong ChatBox / AdminChatBox:
 *
 *   <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
 *     <MessageActions ...props isOwnMessage={isOwn}>
 *       <div className="max-w-[75%] rounded-3xl px-4 py-3 ...">
 *         {nội dung tin nhắn}
 *       </div>
 *     </MessageActions>
 *   </div>
 *
 * MessageActions bọc bubble bằng `div relative group inline-block`,
 * thêm nút 3 chấm absolute bên ngoài bubble,
 * và render action bar + edit box bên dưới (dùng React fragment).
 */
interface MessageActionsProps {
    messageId: number;
    messageType: 'TEXT' | 'IMAGE' | 'FILE' | 'SYSTEM';
    message: string;
    recalled: boolean;
    isOwnMessage: boolean;
    onEdit: (messageId: number, newMessage: string) => void;
    onRecall: (messageId: number) => void;
    onDelete: (messageId: number) => void;
    children: React.ReactNode;
}

export function MessageActions({
    messageId,
    messageType,
    message,
    recalled,
    isOwnMessage,
    onEdit,
    onRecall,
    onDelete,
    children,
}: MessageActionsProps) {
    const [showMenu, setShowMenu] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editedMessage, setEditedMessage] = useState(message);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!showMenu) return;
        const handleOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
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
        /* Fragment: flex-col để action bar + edit box xuống dưới bubble */
        <div ref={containerRef} className="flex flex-col gap-1">
            {/* Hàng bubble + nút 3 chấm */}
            {/* `group` để nút opacity-0 → opacity-100 khi hover */}
            <div className="relative group inline-flex">
                {/* Nút 3 chấm absolute: phía đối diện bubble */}
                <button
                    onClick={() => setShowMenu(v => !v)}
                    className={`
                        absolute top-1 z-10 w-6 h-6 rounded-full
                        bg-black/50 text-white
                        flex items-center justify-center
                        opacity-0 group-hover:opacity-100 transition-opacity
                        shadow hover:bg-black/70
                        ${isOwnMessage ? 'right-full mr-1.5' : 'left-full ml-1.5'}
                    `}
                    title="Thao tác"
                >
                    <MoreVertical className="w-3.5 h-3.5" />
                </button>

                {/* Bubble — KHÔNG bị thay đổi, max-w-[75%] vẫn tính đúng */}
                {children}
            </div>

            {/* Action bar — bên dưới bubble */}
            {showMenu && (
                <div className="bg-gray-900/95 backdrop-blur-xl rounded-full shadow-2xl border border-gray-700 px-1.5 py-1.5 flex gap-1 self-start">
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
            )}

            {/* Edit inline */}
            {isEditing && (
                <div className="w-full max-w-[80%] space-y-2">
                    <textarea
                        value={editedMessage}
                        onChange={e => setEditedMessage(e.target.value)}
                        className="w-full p-2 border-2 border-blue-400 rounded-lg text-gray-900 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={3}
                        autoFocus
                        onKeyDown={e => {
                            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEditConfirm(); }
                            if (e.key === 'Escape') handleEditCancel();
                        }}
                    />
                    <div className="flex gap-2">
                        <button onClick={handleEditConfirm} disabled={!editedMessage.trim() || editedMessage === message}
                            className="px-4 py-2 bg-blue-500 text-white text-sm font-semibold rounded-lg hover:bg-blue-600 disabled:opacity-50 shadow-md">
                            ✓ Lưu
                        </button>
                        <button onClick={handleEditCancel}
                            className="px-4 py-2 bg-gray-500 text-white text-sm font-semibold rounded-lg hover:bg-gray-600 shadow-md">
                            ✕ Hủy
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// Giữ export cũ để không break
export function MessageWrapper(props: MessageActionsProps) { return <MessageActions {...props} />; }
export default function MessageMenu() { return null; }
