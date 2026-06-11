'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Trash2 } from 'lucide-react';
import { chatService, ChatMessage, ChatRoom } from '@/services/chatService';
import ConfirmDialog from '@/components/common/ConfirmDialog';

interface ChatBoxProps {
    customerId: number;
    customerName: string;
    token: string;
}

export default function ChatBox({ customerId, customerName, token }: ChatBoxProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [chatRoom, setChatRoom] = useState<ChatRoom | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const isOpenRef = useRef<boolean>(false);
    const chatRoomRef = useRef<ChatRoom | null>(null);
    
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
    
    // Sync state to refs
    useEffect(() => {
        isOpenRef.current = isOpen;
    }, [isOpen]);
    
    useEffect(() => {
        chatRoomRef.current = chatRoom;
    }, [chatRoom]);

    useEffect(() => {
        // Auto-initialize chat room và WebSocket ngay khi component mount
        // Để có thể nhận tin nhắn ngay cả khi chat đang đóng
        console.log('🚀 [ChatBox] Component mounted, initializing chat');
        initializeChat();
    }, []); // Chỉ chạy 1 lần khi mount

    useEffect(() => {
        // Reset unread khi mở chat
        if (isOpen && chatRoom) {
            console.log('✅ [ChatBox] Chat opened, resetting unread count');
            setUnreadCount(0);
            // Mark messages as read
            chatService.markAdminMessagesAsRead(chatRoom.id, token).catch(err => {
                console.error('❌ [ChatBox] Failed to mark as read on open:', err);
            });
        }
    }, [isOpen, chatRoom, token]);

    useEffect(() => {
        if (chatRoom) {
            console.log('🔌 [ChatBox] Chat room available, loading messages and connecting WebSocket, chatRoom.id:', chatRoom.id);
            loadMessages();
            
            // Connect WebSocket - tạo callback mới mỗi lần chatRoom thay đổi
            const messageHandler = (message: ChatMessage) => {
                console.log('📩 [ChatBox] ========== MESSAGE RECEIVED ==========');
                console.log('📩 [ChatBox] Message data:', message);
                console.log('📩 [ChatBox] Current state - isOpenRef:', isOpenRef.current, 'chatRoomId:', chatRoomRef.current?.id);
                
                setMessages(prev => {
                    console.log('📩 [ChatBox] Adding message to list, current count:', prev.length);
                    return [...prev, message];
                });
                
                // Chỉ tăng unread nếu tin nhắn từ ADMIN
                if (message.senderType === 'ADMIN') {
                    const currentIsOpen = isOpenRef.current;
                    console.log('🔔 [ChatBox] *** ADMIN MESSAGE DETECTED ***');
                    console.log('🔔 [ChatBox] isOpen:', currentIsOpen);
                    
                    if (!currentIsOpen) {
                        // Cửa sổ đang đóng - tăng unread count
                        console.log('🔔 [ChatBox] Chat is CLOSED, will increase unread count');
                        setUnreadCount(prev => {
                            const newCount = prev + 1;
                            console.log('✅ [ChatBox] *** UNREAD COUNT INCREASED *** from', prev, 'to', newCount);
                            return newCount;
                        });
                    } else {
                        // Cửa sổ đang mở - mark as read
                        console.log('✅ [ChatBox] Chat is OPEN, marking as read');
                        setUnreadCount(0);
                        chatService.markAdminMessagesAsRead(message.chatRoomId, token).catch(err => {
                            console.error('❌ [ChatBox] Failed to mark as read:', err);
                        });
                    }
                } else {
                    console.log('📩 [ChatBox] Message is from CUSTOMER, ignoring for badge');
                }
                console.log('📩 [ChatBox] ========================================');
            };
            
            console.log('🔌 [ChatBox] Registering WebSocket callback for chatRoom:', chatRoom.id);
            chatService.connectWebSocket(messageHandler, chatRoom.id);

            return () => {
                console.log('🔌 [ChatBox] Cleaning up WebSocket subscription for chatRoom:', chatRoom.id);
                chatService.unsubscribeFromChat(chatRoom.id);
            };
        }
    }, [chatRoom, token]); // Chỉ depend vào chatRoom và token

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        console.log('🔢 [ChatBox] Unread count changed to:', unreadCount, 'isOpen:', isOpen);
    }, [unreadCount, isOpen]);

    const initializeChat = async () => {
        try {
            setIsLoading(true);
            console.log('🚀 [ChatBox] Initializing chat for customer:', customerId);
            const room = await chatService.getOrCreateChatRoom(customerId, token);
            console.log('✅ [ChatBox] Chat room created/retrieved:', room);
            setChatRoom(room);
            
            // Fetch initial unread count from backend
            try {
                const initialUnread = await chatService.getCustomerUnreadCount(room.id, token);
                console.log('📊 [ChatBox] Initial unread count from backend:', initialUnread);
                setUnreadCount(initialUnread);
            } catch (error) {
                console.error('❌ [ChatBox] Failed to fetch initial unread count:', error);
                // Non-critical error, continue with 0
                setUnreadCount(0);
            }
        } catch (error) {
            console.error('❌ [ChatBox] Failed to initialize chat:', error);
            // Hiển thị thông báo lỗi cho user
            alert('Không thể kết nối đến hệ thống chat. Vui lòng thử lại sau.');
        } finally {
            setIsLoading(false);
        }
    };

    const loadMessages = async () => {
        if (!chatRoom) return;

        try {
            const response = await chatService.getCustomerMessages(chatRoom.id, token);
            setMessages(response.content);
            
            // Auto scroll to bottom sau khi load messages
            setTimeout(() => scrollToBottom(), 100);
        } catch (error) {
            console.error('Failed to load messages:', error);
        }
    };

    const deleteMessage = async (messageId: number) => {
        if (!chatRoom) return;
        
        setConfirmDialog({
            isOpen: true,
            type: 'confirm',
            title: 'Xóa tin nhắn',
            message: 'Bạn có chắc muốn thu hồi tin nhắn này? Tin nhắn sẽ hiển thị "Tin nhắn đã thu hồi".',
            onConfirm: async () => {
                try {
                    await chatService.deleteMessage(messageId, token);
                    // Cập nhật tin nhắn thành "đã thu hồi" thay vì xóa khỏi list
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
        if (!chatRoom) return;
        
        setConfirmDialog({
            isOpen: true,
            type: 'confirm',
            title: 'Xóa đoạn chat',
            message: 'Bạn có chắc muốn xóa đoạn chat này? Admin vẫn sẽ thấy lịch sử trò chuyện.',
            onConfirm: async () => {
                try {
                    // MESSENGER STYLE: Delete for customer only (Admin still sees)
                    await chatService.deleteCustomerChatRoom(chatRoom.id, token);
                    
                    // Close chat box
                    setIsOpen(false);
                    setChatRoom(null);
                    setMessages([]);
                    
                    setConfirmDialog({
                        isOpen: true,
                        type: 'success',
                        title: 'Thành công',
                        message: 'Đã xóa đoạn chat! (Admin vẫn thấy lịch sử)',
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
        if (!inputMessage.trim() || !chatRoom) return;

        try {
            const request = {
                chatRoomId: chatRoom.id,
                senderType: 'CUSTOMER' as const,
                senderId: customerId,
                message: inputMessage.trim(),
            };

            await chatService.sendCustomerMessage(request, token);
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

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const toggleOpen = () => {
        const newIsOpen = !isOpen;
        console.log('🔄 [ChatBox] Toggling chat, newIsOpen:', newIsOpen, 'currentUnreadCount:', unreadCount);
        setIsOpen(newIsOpen);
    };

    return (
        <>
            {/* Floating Chat Button */}
            {!isOpen && (
                <button
                    onClick={toggleOpen}
                    className="fixed bottom-6 right-6 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-full p-4 shadow-2xl hover:shadow-green-400/50 transition-all duration-300 z-50 group hover:scale-110"
                    aria-label="Mở chat hỗ trợ"
                >
                    <MessageCircle className="w-6 h-6" />
                    {unreadCount > 0 && (
                        <span 
                            className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center font-bold animate-pulse shadow-lg"
                        >
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                    )}
                    <span className="absolute right-16 top-1/2 -translate-y-1/2 bg-gray-900 text-white px-3 py-2 rounded-lg text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                        Bạn cần hỗ trợ?
                    </span>
                </button>
            )}

            {/* Chat Window */}
            {isOpen && (
                <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-white/100 rounded-3xl shadow-2xl z-50 flex flex-col overflow-hidden border-2 border-gray-300">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-5 py-4 flex items-center justify-between rounded-t-3xl shadow-lg flex-shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/30 rounded-full flex items-center justify-center shadow-lg">
                                <MessageCircle className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-bold text-base text-white">Hỗ trợ khách hàng</h3>
                                <p className="text-xs text-white font-medium">Chúng tôi luôn sẵn sàng giúp bạn</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {messages.length > 0 && (
                                <button
                                    onClick={deleteAllMessages}
                                    className="hover:bg-white/20 p-1.5 rounded-lg transition-colors"
                                    title="Xóa toàn bộ đoạn chat"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
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

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-white min-h-0">
                                {isLoading ? (
                                    <div className="flex items-center justify-center h-full">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
                                    </div>
                                ) : messages.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-gray-500">
                                        <MessageCircle className="w-16 h-16 mb-3 opacity-40" />
                                        <p className="text-sm font-semibold">Bắt đầu cuộc trò chuyện</p>
                                        <p className="text-xs mt-1 text-gray-400">Chúng tôi sẽ phản hồi sớm nhất có thể</p>
                                    </div>
                                ) : (
                                    messages.map((message) => (
                                        <div
                                            key={message.id}
                                            className={`flex ${message.senderType === 'CUSTOMER' ? 'justify-end' : 'justify-start'}`}
                                        >
                                            <div
                                                className={`max-w-[75%] rounded-3xl px-4 py-3 shadow-md group relative ${
                                                    message.senderType === 'CUSTOMER'
                                                        ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white'
                                                        : 'bg-gradient-to-br from-purple-500 to-indigo-600 text-white'
                                                }`}
                                            >
                                                {/* Nút xóa - chỉ hiện khi hover */}
                                                {message.senderType === 'CUSTOMER' && (
                                                    <button
                                                        onClick={() => deleteMessage(message.id)}
                                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-600"
                                                        title="Xóa tin nhắn"
                                                    >
                                                        ×
                                                    </button>
                                                )}
                                                
                                                {message.senderType === 'ADMIN' && (
                                                    <p className="text-xs font-bold text-white mb-1.5">
                                                        {message.senderName || 'Nhân viên hỗ trợ'}
                                                    </p>
                                                )}
                                                <p className="text-sm leading-relaxed whitespace-pre-wrap break-words font-medium">
                                                    {message.message}
                                                </p>
                                                <p className={`text-xs mt-1.5 font-medium ${
                                                    message.senderType === 'CUSTOMER' ? 'text-white' : 'text-white/95'
                                                }`}>
                                                    {new Date(message.createdAt).toLocaleTimeString('vi-VN', {
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                    })}
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input Area */}
                            <div className="p-4 bg-white/100 border-t-2 border-gray-300 rounded-b-3xl shadow-inner flex-shrink-0">
                                <div className="flex items-end gap-2">
                                    <textarea
                                        value={inputMessage}
                                        onChange={(e) => setInputMessage(e.target.value)}
                                        onKeyPress={handleKeyPress}
                                        placeholder="Nhập tin nhắn..."
                                        className="flex-1 resize-none border-2 border-gray-300 rounded-2xl px-4 py-3 text-sm font-medium text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent max-h-32 overflow-y-auto"
                                        rows={2}
                                    />
                                    <button
                                        onClick={sendMessage}
                                        disabled={!inputMessage.trim()}
                                        className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-3.5 rounded-2xl hover:shadow-lg hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-md"
                                        aria-label="Gửi tin nhắn"
                                    >
                                        <Send className="w-5 h-5" />
                                    </button>
                                </div>
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
