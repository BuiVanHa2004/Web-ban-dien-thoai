'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Users, Trash2 } from 'lucide-react';
import { chatService, ChatMessage, ChatRoom } from '@/services/chatService';
import ConfirmDialog from '@/components/common/ConfirmDialog';

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
    const [totalUnread, setTotalUnread] = useState(0);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const selectedRoomRef = useRef<ChatRoom | null>(null);
    const isLoadingRoomsRef = useRef<boolean>(false);
    
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
                    
                    // Add message to UI
                    setMessages(prev => [...prev, message]);
                    
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

    const loadMessages = async (chatRoomId: number) => {
        try {
            const response = await chatService.getAdminMessages(chatRoomId, token);
            setMessages(response.content);
            
            // Không cần mark as read ở đây nữa vì đã mark ở selectRoom
            // await chatService.markCustomerMessagesAsRead(chatRoomId, token);
            
            // Auto scroll to bottom sau khi load messages
            setTimeout(() => scrollToBottom(), 100);
        } catch (error) {
            console.error('Failed to load messages:', error);
        }
    };

    const deleteMessage = async (messageId: number) => {
        setConfirmDialog({
            isOpen: true,
            type: 'confirm',
            title: 'Xóa tin nhắn',
            message: 'Bạn có chắc muốn thu hồi tin nhắn này? Tin nhắn sẽ hiển thị "Tin nhắn đã thu hồi".',
            onConfirm: async () => {
                try {
                    await chatService.deleteMessage(messageId, token);
                    // Cập nhật tin nhắn thành "đã thu hồi"
                    setMessages(prev => prev.map(m => 
                        m.id === messageId 
                            ? { ...m, message: 'Tin nhắn đã thu hồi', isDeleted: true } as any
                            : m
                    ));
                    setConfirmDialog({
                        isOpen: true,
                        type: 'success',
                        title: 'Thành công',
                        message: 'Tin nhắn đã được thu hồi!',
                        onConfirm: () => setConfirmDialog(prev => ({ ...prev, isOpen: false })),
                    });
                } catch (error) {
                    console.error('Failed to delete message:', error);
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

    const deleteAllMessages = async () => {
        if (!selectedRoom) return;
        
        setConfirmDialog({
            isOpen: true,
            type: 'confirm',
            title: 'Xóa đoạn chat',
            message: 'Bạn có chắc muốn xóa đoạn chat này? Khách hàng vẫn sẽ thấy lịch sử trò chuyện của họ.',
            onConfirm: async () => {
                try {
                    // MESSENGER STYLE: Delete for admin only
                    await chatService.deleteAdminChatRoom(selectedRoom.id, token);
                    
                    // Go back to list
                    setSelectedRoom(null);
                    setMessages([]);
                    
                    // Reload chat rooms
                    loadChatRooms();
                    
                    setConfirmDialog({
                        isOpen: true,
                        type: 'success',
                        title: 'Thành công',
                        message: 'Đã xóa đoạn chat! (Khách hàng vẫn thấy lịch sử của họ)',
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
        if (!inputMessage.trim() || !selectedRoom) return;

        try {
            const request = {
                chatRoomId: selectedRoom.id,
                senderType: 'ADMIN' as const,
                senderId: adminId,
                message: inputMessage.trim(),
            };

            await chatService.sendAdminMessage(request, token);
            setInputMessage('');
        } catch (error) {
            console.error('Failed to send message:', error);
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
                <div className="fixed bottom-6 right-6 w-[480px] h-[600px] bg-white/100 rounded-3xl shadow-2xl z-50 flex flex-col overflow-hidden border-2 border-gray-300">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-5 py-4 flex items-center justify-between rounded-t-3xl shadow-lg">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/30 rounded-full flex items-center justify-center shadow-lg">
                                {selectedRoom ? <MessageCircle className="w-5 h-5" /> : <Users className="w-5 h-5" />}
                            </div>
                            <div>
                                <h3 className="font-bold text-base text-white">
                                    {selectedRoom ? selectedRoom.customerName : 'Chat Quản Lý'}
                                </h3>
                                <p className="text-xs text-white font-medium">
                                    {selectedRoom ? selectedRoom.customerEmail : `${chatRooms.length} cuộc hội thoại`}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
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
                                        className="hover:bg-white/20 px-2 py-1.5 rounded-lg transition-colors text-xs font-medium"
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
                                        {messages.map((message) => (
                                            <div
                                                key={message.id}
                                                className={`flex ${message.senderType === 'ADMIN' ? 'justify-end' : 'justify-start'}`}
                                            >
                                                <div
                                                    className={`max-w-[75%] rounded-2xl px-4 py-2.5 group relative ${
                                                        message.senderType === 'ADMIN'
                                                            ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white'
                                                            : 'bg-gradient-to-br from-green-500 to-emerald-600 text-white'
                                                    }`}
                                                >
                                                    {/* Nút xóa - chỉ hiện khi hover và là tin nhắn của admin */}
                                                    {message.senderType === 'ADMIN' && (
                                                        <button
                                                            onClick={() => deleteMessage(message.id)}
                                                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-600"
                                                            title="Xóa tin nhắn"
                                                        >
                                                            ×
                                                        </button>
                                                    )}
                                                    
                                                    {message.senderType === 'CUSTOMER' && (
                                                        <p className="text-xs font-semibold text-white mb-1">
                                                            {message.senderName}
                                                        </p>
                                                    )}
                                                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                                                        {message.message}
                                                    </p>
                                                    <p className={`text-xs mt-1 ${
                                                        message.senderType === 'ADMIN' ? 'text-white' : 'text-white'
                                                    }`}>
                                                        {new Date(message.createdAt).toLocaleTimeString('vi-VN', {
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                        })}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                        <div ref={messagesEndRef} />
                                    </div>

                                    {/* Input Area */}
                                    <div className="p-4 bg-white/100 border-t-2 border-gray-300 shadow-inner flex-shrink-0">
                                        <div className="flex items-end gap-2">
                                            <textarea
                                                value={inputMessage}
                                                onChange={(e) => setInputMessage(e.target.value)}
                                                onKeyPress={handleKeyPress}
                                                placeholder="Nhập tin nhắn..."
                                                className="flex-1 resize-none border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent max-h-32 overflow-y-auto"
                                                rows={2}
                                            />
                                            <button
                                                onClick={sendMessage}
                                                disabled={!inputMessage.trim()}
                                                className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white p-3 rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                                                aria-label="Gửi tin nhắn"
                                            >
                                                <Send className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
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
