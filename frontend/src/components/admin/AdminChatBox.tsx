'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Users, Trash2, Image as ImageIcon, MoreVertical, Edit, RotateCcw } from 'lucide-react';
import { chatService, ChatMessage, ChatRoom } from '@/services/chatService';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { resolveImageUrl } from '@/common/resolveImageUrl';

interface AdminChatBoxProps {
    adminId: number;
    adminName: string;
    token: string;
}

export default function AdminChatBox({ adminId, adminName, token }: AdminChatBoxProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
    const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [totalUnread, setTotalUnread] = useState(0);
    const [imagePreview, setImagePreview] = useState<{ file: File; url: string } | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const selectedRoomRef = useRef<ChatRoom | null>(null);
    const isLoadingRoomsRef = useRef<boolean>(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    // Cache messages theo roomId — tránh fetch lại khi quay lại room đã xem
    const messagesCacheRef = useRef<Map<number, ChatMessage[]>>(new Map());
    
    // Menu & edit states cho từng message
    const [openMenuId, setOpenMenuId] = useState<number | null>(null);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editText, setEditText] = useState('');
    
    // Dialog states
    const [confirmDialog, setConfirmDialog] = useState<{
        isOpen: boolean;
        type: 'confirm' | 'success' | 'error';
        title: string;
        message: string;
        onConfirm: () => void;
    }>({
        isOpen: false,
        type: 'confirm',
        title: '',
        message: '',
        onConfirm: () => {},
    });
    
    // Sync selectedRoom to ref
    useEffect(() => {
        selectedRoomRef.current = selectedRoom;
    }, [selectedRoom]);

    useEffect(() => {
        // Luôn connect WebSocket để nhận notifications, ngay cả khi chat đóng
        console.log('🔌 [AdminChatBox] Setting up WebSocket for notifications');
        
        // Load initial chat rooms để có unread count ngay từ đầu
        loadChatRooms();
        
        const notificationHandler = (message: ChatMessage) => {
            console.log('📬 [AdminChatBox] ========== NEW MESSAGE NOTIFICATION ==========');
            console.log('📬 [AdminChatBox] Message:', message);
            console.log('📬 [AdminChatBox] Current selectedRoom:', selectedRoomRef.current?.id);
            
            // CRITICAL: Reload rooms để lấy unread count TỪ BACKEND
            // Backend đã tính đúng unread count, frontend chỉ cần lấy
            // KHÔNG tự tính unread count ở frontend
            loadChatRooms();
            
            console.log('📬 [AdminChatBox] ==============================================');
        };
        
        // Connect WebSocket với callback để subscribe khi connection ready
        chatService.connectWebSocket(
            notificationHandler,
            undefined, // không có chatRoomId
            () => {
                // Callback này được gọi khi WebSocket connected
                console.log('🔔 [AdminChatBox] WebSocket ready, subscribing to admin notifications');
                chatService.subscribeToAdminNotifications(notificationHandler);
            }
        );
        
        return () => {
            console.log('🔌 [AdminChatBox] Cleaning up WebSocket');
            chatService.disconnectWebSocket();
        };
    }, []); // Chỉ chạy 1 lần khi mount

    useEffect(() => {
        if (isOpen) {
            console.log('📂 [AdminChatBox] Chat opened, reloading rooms');
            loadChatRooms();
        }
    }, [isOpen]);

    useEffect(() => {
        if (selectedRoom) {
            console.log('🔌 [AdminChatBox] ========== ROOM SELECTED ==========');
            console.log('🔌 [AdminChatBox] Room ID:', selectedRoom.id);
            console.log('🔌 [AdminChatBox] Customer:', selectedRoom.customerName);
            console.log('🔌 [AdminChatBox] Loading messages...');
            
            loadMessages(selectedRoom.id);
            
            // WEBSOCKET LOGIC FOR ACTIVE ROOM
            // Rule: Khi admin đang xem room, mọi tin nhắn customer gửi phải mark as read NGAY LẬP TỨC
            const messageHandler = (message: ChatMessage) => {
                console.log('📩 [AdminChatBox] ========== MESSAGE RECEIVED ==========');
                console.log('📩 [AdminChatBox] Message:', message);
                console.log('📩 [AdminChatBox] Sender:', message.senderType);
                console.log('📩 [AdminChatBox] Current room:', selectedRoomRef.current?.id);
                
                const currentSelectedRoom = selectedRoomRef.current;
                
                if (currentSelectedRoom && message.chatRoomId === currentSelectedRoom.id) {
                    // ✅ RULE 1: Message cho room ĐANG XEM (ACTIVE)
                    console.log('✅ [AdminChatBox] Message for ACTIVE room');
                    
                    // Check if message already exists (for recall events)
                    setMessages(prev => {
                        const existingIndex = prev.findIndex(m => m.id === message.id);
                        let next: ChatMessage[];
                        if (existingIndex !== -1) {
                            // Message exists - UPDATE (for recall)
                            console.log('🔄 [AdminChatBox] Updating existing message:', message.id);
                            next = [...prev];
                            next[existingIndex] = message;
                        } else {
                            // New message - thay thế optimistic nếu cùng nội dung + sender
                            const optimisticIndex = prev.findIndex(
                                m => m.id < 0
                                    && m.senderType === message.senderType
                                    && m.message === message.message
                            );
                            if (optimisticIndex !== -1) {
                                next = [...prev];
                                next[optimisticIndex] = message;
                            } else {
                                next = [...prev, message];
                            }
                        }
                        // Cập nhật cache cùng lúc
                        messagesCacheRef.current.set(message.chatRoomId, next);
                        return next;
                    });
                    
                    if (message.senderType === 'CUSTOMER') {
                        // ✅ CRITICAL: Admin đang xem chat → Mark as read NGAY
                        // → Unread count PHẢI = 0
                        console.log('🔄 [AdminChatBox] CUSTOMER message in ACTIVE room → Mark as read IMMEDIATELY');
                        
                        chatService.markCustomerMessagesAsRead(message.chatRoomId, token)
                            .then(() => {
                                console.log('✅ [AdminChatBox] Marked as read successfully');
                                // Reload rooms để sync unread count từ backend
                                loadChatRooms();
                            })
                            .catch(err => {
                                console.error('❌ [AdminChatBox] Failed to mark as read:', err);
                            });
                        
                        // Optimistic update: Reset unread ngay trong UI
                        setChatRooms(prev => prev.map(room => 
                            room.id === message.chatRoomId ? { ...room, unreadCount: 0 } : room
                        ));
                    } else {
                        // Admin tự gửi tin → không cần mark read
                        console.log('📤 [AdminChatBox] ADMIN message → No action needed');
                    }
                } else {
                    // ✅ RULE 2: Message cho room KHÁC (INACTIVE)
                    console.log('📬 [AdminChatBox] Message for INACTIVE room → Reload rooms');
                    
                    // Reload toàn bộ rooms để lấy unread count từ BACKEND
                    // Backend đã tính đúng, frontend KHÔNG tự tính
                    loadChatRooms();
                }
                
                console.log('📩 [AdminChatBox] ==============================================');
            };
            
            chatService.connectWebSocket(messageHandler, selectedRoom.id);
            
            return () => {
                console.log('🔌 [AdminChatBox] Cleaning up WebSocket subscription for room:', selectedRoom.id);
            };
        }
    }, [selectedRoom, token]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        // Auto scroll when image preview appears
        if (imagePreview) {
            // Wait for image to render, then scroll
            setTimeout(() => {
                scrollToBottom();
            }, 150);
        }
    }, [imagePreview]);

    useEffect(() => {
        // Auto scroll when selecting a room
        if (selectedRoom && messages.length > 0) {
            setTimeout(() => {
                scrollToBottom();
            }, 100);
        }
    }, [selectedRoom]);

    useEffect(() => {
        // Tính số lượng KHÁCH HÀNG có tin nhắn chưa đọc (không phải tổng số tin nhắn)
        // Giống Messenger: badge hiển thị số người nhắn tin, không phải số tin nhắn
        console.log('🔔 [AdminChatBox] Badge calculation START');
        console.log('   - chatRooms:', chatRooms);
        
        const roomsWithUnreadDetails = chatRooms.map(room => ({
            id: room.id,
            name: room.customerName,
            unreadCount: room.unreadCount,
            hasUnread: (room.unreadCount || 0) > 0
        }));
        
        console.log('   - Room details:', roomsWithUnreadDetails);
        
        const customersWithUnread = chatRooms.filter(room => (room.unreadCount || 0) > 0).length;
        
        console.log('🔔 [AdminChatBox] Badge calculation RESULT:');
        console.log('   - Total rooms:', chatRooms.length);
        console.log('   - Rooms with unread:', customersWithUnread);
        
        setTotalUnread(customersWithUnread);
    }, [chatRooms]);

    const loadChatRooms = async () => {
        // Prevent multiple concurrent loads
        if (isLoadingRoomsRef.current) {
            console.log('⏭️ [AdminChatBox] Already loading rooms, skipping...');
            return;
        }
        
        try {
            isLoadingRoomsRef.current = true;
            console.log('📂 [AdminChatBox] Loading chat rooms...');
            const response = await chatService.getAdminChatRooms(token);
            console.log('📂 [AdminChatBox] Loaded rooms:', response.content);
            
            // Deduplicate rooms by id to prevent React key errors
            const uniqueRooms = response.content.reduce((acc: ChatRoom[], room: ChatRoom) => {
                if (!acc.find(r => r.id === room.id)) {
                    acc.push(room);
                } else {
                    console.warn('⚠️ [AdminChatBox] Duplicate room found:', room.id);
                }
                return acc;
            }, []);
            
            console.log('📂 [AdminChatBox] Unique rooms:', uniqueRooms.length, 'out of', response.content.length);
            setChatRooms(uniqueRooms);
        } catch (error) {
            console.error('❌ [AdminChatBox] Failed to load chat rooms:', error);
        } finally {
            isLoadingRoomsRef.current = false;
        }
    };

    const loadMessages = async (chatRoomId: number, forceReload = false) => {
        // Dùng cache nếu đã có và không bắt buộc reload
        if (!forceReload) {
            const cached = messagesCacheRef.current.get(chatRoomId);
            if (cached && cached.length > 0) {
                setMessages(cached);
                setTimeout(() => scrollToBottom(), 50);
                return;
            }
        }
        try {
            const response = await chatService.getAdminMessages(chatRoomId, token, 0, 100);
            messagesCacheRef.current.set(chatRoomId, response.content);
            setMessages(response.content);
            setTimeout(() => scrollToBottom(), 50);
        } catch (error) {
            console.error('Failed to load messages:', error);
        }
    };

    const handleEditMessage = async (messageId: number, newMessage: string) => {
        try {
            const updated = await chatService.editMessage(messageId, newMessage, token);
            setMessages(prev => prev.map(m => m.id === messageId ? updated : m));
        } catch (error) {
            console.error('Failed to edit message:', error);
            alert('Không thể chỉnh sửa tin nhắn. Vui lòng thử lại.');
        }
    };

    const handleRecallMessage = async (messageId: number) => {
        setConfirmDialog({
            isOpen: true,
            type: 'confirm',
            title: 'Thu hồi tin nhắn',
            message: 'Bạn có chắc muốn thu hồi tin nhắn này? Cả hai bên sẽ thấy "Tin nhắn đã được thu hồi".',
            onConfirm: async () => {
                try {
                    const recalled = await chatService.recallMessage(messageId, token);
                    setMessages(prev => prev.map(m => m.id === messageId ? recalled : m));
                    setConfirmDialog({
                        isOpen: true,
                        type: 'success',
                        title: 'Thành công',
                        message: 'Tin nhắn đã được thu hồi!',
                        onConfirm: () => setConfirmDialog(prev => ({ ...prev, isOpen: false })),
                    });
                } catch (error) {
                    console.error('Failed to recall message:', error);
                    setConfirmDialog({
                        isOpen: true,
                        type: 'error',
                        title: 'Lỗi',
                        message: 'Không thể thu hồi tin nhắn. Vui lòng thử lại.',
                        onConfirm: () => setConfirmDialog(prev => ({ ...prev, isOpen: false })),
                    });
                }
            },
        });
    };

    const handleDeleteMessage = async (messageId: number) => {
        setConfirmDialog({
            isOpen: true,
            type: 'confirm',
            title: 'Xóa tin nhắn',
            message: 'Bạn có chắc muốn xóa tin nhắn này? (Chỉ bạn không thấy, Customer vẫn thấy)',
            onConfirm: async () => {
                try {
                    await chatService.deleteMessageForMe(messageId, 'ADMIN', token);
                    setMessages(prev => prev.filter(m => m.id !== messageId));
                    setConfirmDialog({
                        isOpen: true,
                        type: 'success',
                        title: 'Thành công',
                        message: 'Tin nhắn đã được xóa khỏi danh sách của bạn!',
                        onConfirm: () => setConfirmDialog(prev => ({ ...prev, isOpen: false })),
                    });
                } catch (error) {
                    console.error('Failed to delete message:', error);
                    setConfirmDialog({
                        isOpen: true,
                        type: 'error',
                        title: 'Lỗi',
                        message: 'Không thể xóa tin nhắn. Vui lòng thử lại.',
                        onConfirm: () => setConfirmDialog(prev => ({ ...prev, isOpen: false })),
                    });
                }
            },
        });
    };

    const deleteMessage = async (messageId: number) => {
        // Keep old function for compatibility
        handleRecallMessage(messageId);
    };

    const deleteAllMessages = async () => {
        if (!selectedRoom) return;
        
        setConfirmDialog({
            isOpen: true,
            type: 'confirm',
            title: 'Xóa đoạn chat',
            message: 'Bạn có chắc muốn xóa đoạn chat này? Bạn chỉ thấy tin nhắn mới khi Khách hàng trả lời.',
            onConfirm: async () => {
                try {
                    // MESSENGER STYLE: Set admin_deleted_at timestamp
                    await chatService.deleteAdminChatRoom(selectedRoom.id, token);
                    
                    // Go back to list
                    const deletedRoomId = selectedRoom.id;
                    setSelectedRoom(null);
                    setMessages([]);
                    messagesCacheRef.current.delete(deletedRoomId); // xóa cache
                    
                    // Reload chat rooms
                    loadChatRooms();
                    
                    console.log('✅ [AdminChatBox] Admin deleted chat at:', new Date().toISOString());
                    console.log('📌 [AdminChatBox] Chat will reappear when customer sends new message');
                    console.log('📌 [AdminChatBox] Only NEW messages (after delete time) will be visible');
                    
                    setConfirmDialog({
                        isOpen: true,
                        type: 'success',
                        title: 'Thành công',
                        message: 'Đã xóa đoạn chat! Bạn sẽ chỉ thấy tin nhắn mới khi Khách hàng trả lời.',
                        onConfirm: () => setConfirmDialog(prev => ({ ...prev, isOpen: false })),
                    });
                } catch (error) {
                    console.error('Failed to delete chat room:', error);
                    setConfirmDialog({
                        isOpen: true,
                        type: 'error',
                        title: 'Lỗi',
                        message: 'Không thể xóa đoạn chat. Vui lòng thử lại.',
                        onConfirm: () => setConfirmDialog(prev => ({ ...prev, isOpen: false })),
                    });
                }
            },
        });
    };

    const sendMessage = async () => {
        const text = inputMessage.trim();
        if (!text || !selectedRoom) return;

        // Optimistic update: xóa input + thêm tin nhắn ngay lập tức
        setInputMessage('');
        const tempId = Date.now() * -1;
        const optimisticMsg: ChatMessage = {
            id: tempId,
            chatRoomId: selectedRoom.id,
            senderType: 'ADMIN',
            senderId: adminId,
            senderName: adminName,
            message: text,
            messageType: 'TEXT',
            isRead: false,
            createdAt: new Date().toISOString(),
        };
        setMessages(prev => [...prev, optimisticMsg]);

        try {
            const request = {
                chatRoomId: selectedRoom.id,
                senderType: 'ADMIN' as const,
                senderId: adminId,
                message: text,
                messageType: 'TEXT' as const,
            };
            const sentMessage = await chatService.sendAdminMessage(request, token);
            // CRITICAL FIX: Use API response immediately, don't wait for WebSocket
            setMessages(prev => prev.map(m => m.id === tempId ? sentMessage : m));
        } catch (error) {
            console.error('Failed to send message:', error);
            // Xóa optimistic message nếu lỗi, khôi phục input
            setMessages(prev => prev.filter(m => m.id !== tempId));
            setInputMessage(text);
        }
    };

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !selectedRoom) return;

        if (!file.type.startsWith('image/')) {
            alert('Vui lòng chọn file ảnh (jpg, png, gif, webp)');
            return;
        }

        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            alert('Ảnh quá lớn! Vui lòng chọn ảnh nhỏ hơn 10MB');
            return;
        }

        // Create preview URL
        const previewUrl = URL.createObjectURL(file);
        setImagePreview({ file, url: previewUrl });
        // Scroll is handled by useEffect
        
        // Reset file input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleConfirmImage = async () => {
        if (!imagePreview || !selectedRoom) return;

        try {
            setIsUploading(true);
            
            // Upload to MinIO
            const uploadResult = await chatService.uploadChatImage(imagePreview.file, token);
            
            const request = {
                chatRoomId: selectedRoom.id,
                senderType: 'ADMIN' as const,
                senderId: adminId,
                message: '',
                messageType: 'IMAGE' as const,
                attachmentUrl: uploadResult.url,
            };

            await chatService.sendAdminMessage(request, token);
            
            // Cleanup
            URL.revokeObjectURL(imagePreview.url);
            setImagePreview(null);
        } catch (error) {
            console.error('Failed to send image:', error);
            alert('Không thể gửi ảnh. Vui lòng thử lại.');
        } finally {
            setIsUploading(false);
        }
    };

    const handleCancelImage = () => {
        if (imagePreview) {
            URL.revokeObjectURL(imagePreview.url);
            setImagePreview(null);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const selectRoom = async (room: ChatRoom) => {
        console.log('📂 [AdminChatBox] Selecting room:', room.id, 'current unreadCount:', room.unreadCount);
        setSelectedRoom(room);
        
        // Reset unread count cho room này ngay lập tức trong UI
        setChatRooms(prev => prev.map(r => 
            r.id === room.id ? { ...r, unreadCount: 0 } : r
        ));
        
        // Mark customer messages as read ngay khi vào xem
        // Đợi mark as read hoàn thành để đảm bảo backend đã update
        try {
            console.log('📝 [AdminChatBox] Marking messages as read for room:', room.id);
            await chatService.markCustomerMessagesAsRead(room.id, token);
            console.log('✅ [AdminChatBox] Marked messages as read for room:', room.id);
            
            // Sau khi mark as read xong, reload rooms để sync với backend
            // Delay nhỏ để đảm bảo database đã commit
            setTimeout(() => {
                console.log('🔄 [AdminChatBox] Reloading rooms after mark as read');
                loadChatRooms();
            }, 200);
        } catch (error) {
            console.error('❌ [AdminChatBox] Failed to mark as read:', error);
        }
        
        // Auto assign if not assigned
        if (!room.adminId) {
            try {
                await chatService.assignAdminToChatRoom(room.id, adminId, token);
                // Reload để cập nhật admin info
                loadChatRooms();
            } catch (error) {
                console.error('Failed to assign admin:', error);
            }
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const toggleOpen = async () => {
        const newIsOpen = !isOpen;
        console.log('🔄 [AdminChatBox] Toggling chat, newIsOpen:', newIsOpen);
        
        // Khi đóng chat, reload rooms trước để sync unread count
        if (!newIsOpen) {
            console.log('🔄 [AdminChatBox] Chat closing, syncing unread count from backend...');
            await loadChatRooms();
        }
        
        setIsOpen(newIsOpen);
        
        // Khi đóng chat, reset về danh sách
        if (!newIsOpen && selectedRoom) {
            console.log('📕 [AdminChatBox] Resetting to list view');
            setSelectedRoom(null);
            setMessages([]);
        }
    };

    const backToList = () => {
        console.log('⬅️ [AdminChatBox] Back to list, reloading rooms');
        setSelectedRoom(null);
        setMessages([]);
        // Reload rooms để đồng bộ unread count từ backend
        loadChatRooms();
    };

    return (
        <>
            {/* Floating Chat Button */}
            {!isOpen && (
                <button
                    onClick={toggleOpen}
                    className="fixed bottom-6 right-6 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-full p-4 shadow-2xl hover:shadow-purple-400/50 transition-all duration-300 z-50 group hover:scale-110"
                    aria-label="Mở chat quản lý"
                >
                    <MessageCircle className="w-6 h-6" />
                    {totalUnread > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center font-bold animate-pulse shadow-lg">
                            {totalUnread > 99 ? '99+' : totalUnread}
                        </span>
                    )}
                    <span className="absolute right-16 top-1/2 -translate-y-1/2 bg-gray-900 text-white px-3 py-2 rounded-lg text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                        Tin nhắn khách hàng
                    </span>
                </button>
            )}

            {/* Chat Window */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                    onClick={toggleOpen}
                >
                    <div
                        className="w-full max-w-[480px] h-[85dvh] bg-white rounded-[2rem] shadow-2xl flex flex-col overflow-hidden border-2 border-gray-300"
                        onClick={(e) => e.stopPropagation()}
                    >
                    {/* Header */}
                    <div className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-4 py-3 flex flex-col gap-1 rounded-t-3xl shadow-lg flex-shrink-0">
                        {/* Row 1: các nút */}
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-white/70 font-medium">
                                {selectedRoom ? 'Đang trò chuyện' : 'Chat Quản Lý'}
                            </span>
                            <div className="flex items-center gap-1">
                                {selectedRoom && (
                                    <>
                                        {messages.length > 0 && (
                                            <button
                                                onClick={deleteAllMessages}
                                                className="hover:bg-white/20 p-1.5 rounded-lg transition-colors"
                                                title="Xóa toàn bộ đoạn chat"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                        <button
                                            onClick={backToList}
                                            className="hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors text-xs font-medium whitespace-nowrap"
                                        >
                                            Quay lại
                                        </button>
                                    </>
                                )}
                                <button
                                    onClick={toggleOpen}
                                    className="hover:bg-white/20 p-1.5 rounded-lg transition-colors"
                                    aria-label="Đóng chat"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                        {/* Row 2: icon + tên */}
                        <div className="flex items-center gap-2 min-w-0">
                            <div className="w-9 h-9 flex-shrink-0 bg-white/30 rounded-full flex items-center justify-center shadow-lg">
                                {selectedRoom ? <MessageCircle className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                            </div>
                            <div className="min-w-0">
                                <h3 className="font-bold text-sm text-white truncate">
                                    {selectedRoom ? selectedRoom.customerName : 'Chat Quản Lý'}
                                </h3>
                                <p className="text-xs text-white/80 truncate">
                                    {selectedRoom ? selectedRoom.customerEmail : `${chatRooms.length} cuộc hội thoại`}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Chat Rooms List or Messages */}
                    {!selectedRoom ? (
                        <div className="flex-1 min-h-0 overflow-y-auto bg-white">
                                    {chatRooms.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-full text-gray-400 p-6">
                                            <Users className="w-16 h-16 mb-3 opacity-50" />
                                            <p className="text-sm text-center">Chưa có cuộc hội thoại nào</p>
                                        </div>
                                    ) : (
                                        chatRooms.map((room) => (
                                            <div
                                                key={room.id}
                                                onClick={() => selectRoom(room)}
                                                className="p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-100/50 transition-colors"
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-indigo-500 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                                                        {room.customerName.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between mb-1">
                                                            <h3 className="font-semibold text-sm truncate">{room.customerName}</h3>
                                                            {room.unreadCount > 0 && (
                                                                <span className="bg-red-500 text-white text-xs rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center ml-2 font-bold">
                                                                    {room.unreadCount > 99 ? '99+' : room.unreadCount}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-gray-500 truncate">{room.customerEmail}</p>
                                                        <p className="text-xs text-gray-400 mt-1">
                                                            {new Date(room.lastMessageAt).toLocaleString('vi-VN', {
                                                                month: 'short',
                                                                day: 'numeric',
                                                                hour: '2-digit',
                                                                minute: '2-digit',
                                                            })}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            ) : (
                                <>
                                    {/* Messages Area */}
                                    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-white min-h-0">
                                        {messages.map((message) => {
                                            const isRecalled = message.recalled || message.message === 'Tin nhắn đã được thu hồi';
                                            const isOwnMessage = message.senderType === 'ADMIN';
                                            const isMenuOpen = openMenuId === message.id;
                                            const isEditing = editingId === message.id;

                                            return (
                                                <div key={message.id}>
                                                    {/* Hàng chính: bubble + nút 3 chấm */}
                                                    <div className={`flex items-start gap-1.5 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                                                        {/* Nút 3 chấm bên trái bubble (cho tin nhắn bên phải) */}
                                                        {isOwnMessage && (
                                                            <button
                                                                onClick={() => setOpenMenuId(isMenuOpen ? null : message.id)}
                                                                className="mt-1 flex-shrink-0 w-6 h-6 rounded-full bg-black/40 text-white flex items-center justify-center sm:opacity-0 sm:hover:opacity-100 transition-opacity shadow"
                                                                title="Thao tác"
                                                            >
                                                                <MoreVertical className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                        
                                                        {/* Bubble */}
                                                        <div className={`max-w-[75%] rounded-3xl px-4 py-3 shadow-md ${
                                                            isOwnMessage
                                                                ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white'
                                                                : 'bg-gradient-to-br from-green-500 to-emerald-600 text-white'
                                                        } ${message.id < 0 ? 'opacity-60' : ''}`}>
                                                            {!isOwnMessage && message.senderName && (
                                                                <p className="text-xs font-bold text-white mb-1.5">
                                                                    {message.senderName}
                                                                </p>
                                                            )}
                                                            {message.messageType === 'IMAGE' && message.attachmentUrl && !isRecalled ? (
                                                                <div className="space-y-1.5">
                                                                    <img src={resolveImageUrl(message.attachmentUrl) || message.attachmentUrl} alt="Hình ảnh"
                                                                        className="max-w-full rounded-2xl cursor-pointer hover:opacity-90 transition-opacity"
                                                                        onClick={() => window.open(resolveImageUrl(message.attachmentUrl) || message.attachmentUrl, '_blank')}
                                                                        loading="lazy" />
                                                                    {message.message && (
                                                                        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words font-medium">{message.message}</p>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <p className="text-sm leading-relaxed whitespace-pre-wrap break-words font-medium">{message.message}</p>
                                                            )}
                                                            {message.edited && !isRecalled && (<p className="text-xs mt-1 italic opacity-75">(đã chỉnh sửa)</p>)}
                                                            <p className={`text-xs mt-1.5 font-medium ${isOwnMessage ? 'text-white' : 'text-white/95'}`}>
                                                                {new Date(message.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                                            </p>
                                                        </div>

                                                        {/* Nút 3 chấm bên phải bubble (cho tin nhắn bên trái) */}
                                                        {!isOwnMessage && (
                                                            <button
                                                                onClick={() => setOpenMenuId(isMenuOpen ? null : message.id)}
                                                                className="mt-1 flex-shrink-0 w-6 h-6 rounded-full bg-black/40 text-white flex items-center justify-center sm:opacity-0 sm:hover:opacity-100 transition-opacity shadow"
                                                                title="Thao tác"
                                                            >
                                                                <MoreVertical className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                    </div>

                                                    {/* Action bar — BÊN DƯỚI bubble, tạo khoảng trống */}
                                                    {isMenuOpen && (
                                                        <div className={`flex mt-1 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                                                            <div className="bg-gray-900/95 backdrop-blur-xl rounded-full shadow-2xl border border-gray-700 px-1.5 py-1.5 flex gap-1">
                                                                {message.messageType === 'TEXT' && !isRecalled && isOwnMessage && (
                                                                    <button
                                                                        onClick={() => { setEditingId(message.id); setEditText(message.message); setOpenMenuId(null); }}
                                                                        className="w-7 h-7 rounded-full text-white bg-blue-500/20 hover:bg-blue-500 flex items-center justify-center transition-colors"
                                                                        title="Chỉnh sửa"
                                                                    >
                                                                        <Edit className="w-3 h-3" />
                                                                    </button>
                                                                )}
                                                                {!isRecalled && isOwnMessage && (
                                                                    <button
                                                                        onClick={() => { handleRecallMessage(message.id); setOpenMenuId(null); }}
                                                                        className="w-7 h-7 rounded-full text-white bg-orange-500/20 hover:bg-orange-500 flex items-center justify-center transition-colors"
                                                                        title="Thu hồi"
                                                                    >
                                                                        <RotateCcw className="w-3 h-3" />
                                                                    </button>
                                                                )}
                                                                <button
                                                                    onClick={() => { handleDeleteMessage(message.id); setOpenMenuId(null); }}
                                                                    className="w-7 h-7 rounded-full text-white bg-red-500/20 hover:bg-red-500 flex items-center justify-center transition-colors"
                                                                    title="Xóa"
                                                                >
                                                                    <Trash2 className="w-3 h-3" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Edit inline */}
                                                    {isEditing && (
                                                        <div className={`flex mt-1 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                                                            <div className="w-full max-w-[80%] space-y-2">
                                                                <textarea
                                                                    value={editText}
                                                                    onChange={e => setEditText(e.target.value)}
                                                                    className="w-full p-2 border-2 border-blue-400 rounded-lg text-gray-900 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                                    rows={3}
                                                                    autoFocus
                                                                    onKeyDown={e => {
                                                                        if (e.key === 'Enter' && !e.shiftKey) {
                                                                            e.preventDefault();
                                                                            if (editText.trim() && editText !== message.message) {
                                                                                handleEditMessage(message.id, editText.trim());
                                                                                setEditingId(null);
                                                                            }
                                                                        }
                                                                        if (e.key === 'Escape') { setEditingId(null); }
                                                                    }}
                                                                />
                                                                <div className="flex gap-2">
                                                                    <button
                                                                        onClick={() => { if (editText.trim() && editText !== message.message) { handleEditMessage(message.id, editText.trim()); setEditingId(null); } }}
                                                                        disabled={!editText.trim() || editText === message.message}
                                                                        className="px-4 py-2 bg-blue-500 text-white text-sm font-semibold rounded-lg hover:bg-blue-600 disabled:opacity-50 shadow-md">
                                                                        ✓ Lưu
                                                                    </button>
                                                                    <button onClick={() => setEditingId(null)} className="px-4 py-2 bg-gray-500 text-white text-sm font-semibold rounded-lg hover:bg-gray-600 shadow-md">
                                                                        ✕ Hủy
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                        
                                        {/* Image Preview - Show in chat area */}
                                        {imagePreview && (
                                            <div className="flex justify-end">
                                                <div className="max-w-[75%] bg-gray-100 rounded-2xl p-3 shadow-lg">
                                                    <p className="text-xs font-semibold text-gray-700 mb-2">📷 Xem trước ảnh</p>
                                                    <img 
                                                        src={imagePreview.url} 
                                                        alt="Preview" 
                                                        className="max-w-full rounded-xl mb-2"
                                                    />
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={handleConfirmImage}
                                                            disabled={isUploading}
                                                            className="flex-1 bg-purple-500 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-purple-600 transition-colors disabled:opacity-50"
                                                        >
                                                            {isUploading ? 'Đang gửi...' : '✓ Đồng ý'}
                                                        </button>
                                                        <button
                                                            onClick={handleCancelImage}
                                                            disabled={isUploading}
                                                            className="flex-1 bg-gray-500 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-600 transition-colors disabled:opacity-50"
                                                        >
                                                            × Hủy
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        <div ref={messagesEndRef} />
                                    </div>

                                    {/* Input Area */}
                                    <div className="p-4 bg-white/100 border-t-2 border-gray-300 shadow-inner flex-shrink-0">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <input 
                                                ref={fileInputRef}
                                                type="file" 
                                                accept="image/jpeg,image/jpg,image/png,image/webp,image/gif" 
                                                className="hidden" 
                                                onChange={handleImageSelect}
                                                disabled={isUploading || !!imagePreview}
                                            />
                                            <button
                                                onClick={() => fileInputRef.current?.click()}
                                                disabled={isUploading || !!imagePreview}
                                                className="bg-gray-100 text-gray-700 p-2.5 rounded-xl hover:bg-gray-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm flex-shrink-0"
                                                title="Gửi hình ảnh"
                                            >
                                                <ImageIcon className="w-4 h-4" />
                                            </button>
                                            <input
                                                type="text"
                                                value={inputMessage}
                                                onChange={(e) => setInputMessage(e.target.value)}
                                                onKeyPress={handleKeyPress}
                                                placeholder={isUploading ? "Đang tải ảnh..." : "Nhập tin nhắn..."}
                                                className="flex-1 min-w-0 border-2 border-gray-300 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                                                disabled={isUploading || !!imagePreview}
                                            />
                                            <button
                                                onClick={sendMessage}
                                                disabled={!inputMessage.trim() || isUploading || !!imagePreview}
                                                className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white p-2.5 rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-md flex-shrink-0"
                                                aria-label="Gửi tin nhắn"
                                            >
                                                <Send className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                </div>
                </div>
            )}
            
            {/* Confirm Dialog */}
            <ConfirmDialog
                isOpen={confirmDialog.isOpen}
                type={confirmDialog.type}
                title={confirmDialog.title}
                message={confirmDialog.message}
                onConfirm={confirmDialog.onConfirm}
                onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
            />
        </>
    );
}
