'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Trash2, Image as ImageIcon } from 'lucide-react';
import { chatService, ChatMessage, ChatRoom } from '@/services/chatService';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import MessageMenu from '@/components/chat/MessageMenu';

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
    const [isUploading, setIsUploading] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [imagePreview, setImagePreview] = useState<{ file: File; url: string } | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const isOpenRef = useRef<boolean>(false);
    const chatRoomRef = useRef<ChatRoom | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
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
                    console.log('📩 [ChatBox] Processing message, current count:', prev.length);
                    
                    // Check if message already exists (update it)
                    const existingIndex = prev.findIndex(m => m.id === message.id);
                    
                    if (existingIndex !== -1) {
                        // Message exists - UPDATE (for recall events)
                        console.log('🔄 [ChatBox] Updating existing message:', message.id);
                        const updated = [...prev];
                        updated[existingIndex] = message;
                        return updated;
                    } else {
                        // New message - ADD
                        console.log('📩 [ChatBox] Adding new message to list');
                        return [...prev, message];
                    }
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
        // Auto scroll when image preview appears
        if (imagePreview) {
            // Wait for image to render, then scroll
            setTimeout(() => {
                scrollToBottom();
            }, 150);
        }
    }, [imagePreview]);

    useEffect(() => {
        // Auto scroll when chat opens
        if (isOpen && messages.length > 0) {
            setTimeout(() => {
                scrollToBottom();
            }, 100);
        }
    }, [isOpen]);

    useEffect(() => {
        console.log('🔢 [ChatBox] Unread count changed to:', unreadCount, 'isOpen:', isOpen);
    }, [unreadCount, isOpen]);

    const initializeChat = async () => {
        try {
            setIsLoading(true);
            console.log('🚀 [ChatBox] Initializing chat for customer:', customerId);
            
            // MESSENGER STYLE: Always get THE SAME room (never create duplicate)
            const room = await chatService.getOrCreateChatRoom(customerId, token);
            console.log('✅ [ChatBox] Chat room:', room);
            
            setChatRoom(room);
            
            // Fetch initial unread count from backend
            try {
                const initialUnread = await chatService.getCustomerUnreadCount(room.id, token);
                console.log('📊 [ChatBox] Initial unread count from backend:', initialUnread);
                setUnreadCount(initialUnread);
            } catch (error) {
                console.error('❌ [ChatBox] Failed to fetch initial unread count:', error);
                setUnreadCount(0);
            }
        } catch (error) {
            console.error('❌ [ChatBox] Failed to initialize chat:', error);
            // Silently fail - don't show alert to user on page load
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
            message: 'Bạn có chắc muốn xóa tin nhắn này? (Chỉ bạn không thấy, Admin vẫn thấy)',
            onConfirm: async () => {
                try {
                    await chatService.deleteMessageForMe(messageId, 'CUSTOMER', token);
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
        if (!chatRoom) return;
        
        setConfirmDialog({
            isOpen: true,
            type: 'confirm',
            title: 'Xóa đoạn chat',
            message: 'Bạn có chắc muốn xóa đoạn chat này? Bạn chỉ thấy tin nhắn mới khi Admin trả lời.',
            onConfirm: async () => {
                try {
                    // MESSENGER STYLE: Set customer_deleted_at timestamp
                    await chatService.deleteCustomerChatRoom(chatRoom.id, token);
                    
                    // Close chat box and clear messages
                    setIsOpen(false);
                    setMessages([]);
                    
                    // Log for debugging
                    console.log('✅ [ChatBox] Customer deleted chat at:', new Date().toISOString());
                    console.log('📌 [ChatBox] Chat will reappear when admin sends new message');
                    console.log('📌 [ChatBox] Only NEW messages (after delete time) will be visible');
                    
                    setConfirmDialog({
                        isOpen: true,
                        type: 'success',
                        title: 'Thành công',
                        message: 'Đã xóa đoạn chat! Bạn sẽ chỉ thấy tin nhắn mới khi Admin trả lời.',
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
                messageType: 'TEXT' as const,
            };

            await chatService.sendCustomerMessage(request, token);
            setInputMessage('');
        } catch (error) {
            console.error('Failed to send message:', error);
        }
    };

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !chatRoom) return;

        // Validate image
        if (!file.type.startsWith('image/')) {
            alert('Vui lòng chọn file ảnh (jpg, png, gif, webp)');
            return;
        }

        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            alert('Ảnh quá lớn! Vui lòng chọn ảnh nhỏ hơn 5MB');
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
        if (!imagePreview || !chatRoom) return;

        try {
            setIsUploading(true);
            
            // Upload image to MinIO
            const uploadResult = await chatService.uploadChatImage(imagePreview.file, token);
            
            // Send image message
            const request = {
                chatRoomId: chatRoom.id,
                senderType: 'CUSTOMER' as const,
                senderId: customerId,
                message: '',
                messageType: 'IMAGE' as const,
                attachmentUrl: uploadResult.url,
            };

            await chatService.sendCustomerMessage(request, token);
            
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
                    className="fixed bottom-24 right-4 sm:bottom-6 sm:right-6 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-full p-3 sm:p-4 shadow-2xl hover:shadow-green-400/50 transition-all duration-300 z-50 group hover:scale-110"
                    aria-label="Mở chat hỗ trợ"
                >
                    <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6" />
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
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                    onClick={toggleOpen}
                >
                    <div
                        className="w-full max-w-sm h-[85dvh] bg-white rounded-[2rem] shadow-2xl flex flex-col overflow-hidden border-2 border-gray-300"
                        onClick={(e) => e.stopPropagation()}
                    >
                    {/* Header */}
                    <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-5 py-3 flex flex-col gap-1 rounded-t-3xl shadow-lg flex-shrink-0">
                        {/* Row 1: các nút */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-white/30 rounded-full flex items-center justify-center shadow-lg">
                                    <MessageCircle className="w-4 h-4" />
                                </div>
                                <span className="font-bold text-sm text-white">Hỗ trợ khách hàng</span>
                            </div>
                            <div className="flex items-center gap-1">
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
                                    onClick={toggleOpen}
                                    className="hover:bg-white/20 p-1.5 rounded-lg transition-colors"
                                    aria-label="Đóng chat"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                        {/* Row 2: subtitle */}
                        <p className="text-xs text-white/80">Chúng tôi luôn sẵn sàng giúp bạn</p>
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
                                    <>
                                        {messages.map((message) => {
                                            const isRecalled = message.recalled || message.message === 'Tin nhắn đã được thu hồi';
                                            const isOwnMessage = message.senderType === 'CUSTOMER';

                                            return (
                                                <div
                                                    key={message.id}
                                                    className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                                                >
                                                    <div
                                                        className={`max-w-[75%] rounded-3xl px-4 py-3 shadow-md group relative ${
                                                            isOwnMessage
                                                                ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white'
                                                                : 'bg-gradient-to-br from-purple-500 to-indigo-600 text-white'
                                                        }`}
                                                    >
                                                        {/* MESSAGE MENU - Thay thế nút X */}
                                                        <MessageMenu
                                                            messageId={message.id}
                                                            messageType={message.messageType}
                                                            message={message.message}
                                                            recalled={isRecalled}
                                                            isOwnMessage={isOwnMessage}
                                                            onEdit={handleEditMessage}
                                                            onRecall={handleRecallMessage}
                                                            onDelete={handleDeleteMessage}
                                                        />
                                                        
                                                        {!isOwnMessage && message.senderName && (
                                                            <p className="text-xs font-bold text-white mb-1.5">
                                                                {message.senderName || 'Nhân viên hỗ trợ'}
                                                            </p>
                                                        )}
                                                        
                                                        {/* Display image or text */}
                                                        {message.messageType === 'IMAGE' && message.attachmentUrl && !isRecalled ? (
                                                            <div className="space-y-1.5">
                                                                <img 
                                                                    src={message.attachmentUrl} 
                                                                    alt="Hình ảnh" 
                                                                    className="max-w-full rounded-2xl cursor-pointer hover:opacity-90 transition-opacity"
                                                                    onClick={() => window.open(message.attachmentUrl, '_blank')}
                                                                    loading="lazy"
                                                                />
                                                                {message.message && (
                                                                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words font-medium">
                                                                        {message.message}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words font-medium">
                                                                {message.message}
                                                            </p>
                                                        )}

                                                        {/* Edited badge */}
                                                        {message.edited && !isRecalled && (
                                                            <p className="text-xs mt-1 italic opacity-75">(đã chỉnh sửa)</p>
                                                        )}
                                                        
                                                        <p className={`text-xs mt-1.5 font-medium ${
                                                            isOwnMessage ? 'text-white' : 'text-white/95'
                                                        }`}>
                                                            {new Date(message.createdAt).toLocaleTimeString('vi-VN', {
                                                                hour: '2-digit',
                                                                minute: '2-digit',
                                                            })}
                                                        </p>
                                                    </div>
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
                                                        className="flex-1 bg-green-500 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-green-600 transition-colors disabled:opacity-50"
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
                                    </>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input Area */}
                            <div className="p-4 bg-white/100 border-t-2 border-gray-300 rounded-b-3xl shadow-inner flex-shrink-0">
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
                                        className="flex-1 min-w-0 border-2 border-gray-300 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
                                        disabled={isUploading || !!imagePreview}
                                    />
                                    <button
                                        onClick={sendMessage}
                                        disabled={!inputMessage.trim() || isUploading || !!imagePreview}
                                        className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-2.5 rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-md flex-shrink-0"
                                        aria-label="Gửi tin nhắn"
                                    >
                                        <Send className="w-5 h-5" />
                                    </button>
                                </div>
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
