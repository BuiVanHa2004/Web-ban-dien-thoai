'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Trash2, Image as ImageIcon, MoreVertical, Edit, RotateCcw } from 'lucide-react';
import { chatService, ChatMessage, ChatRoom } from '@/services/chatService';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { resolveImageUrl } from '@/common/resolveImageUrl';

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
    // Cache: đã load messages rồi thì không fetch lại khi mở/đóng
    const messagesLoadedRef = useRef<boolean>(false);
    
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
                        // New message - ADD (thay thế optimistic nếu cùng nội dung + sender)
                        const optimisticIndex = prev.findIndex(
                            m => m.id < 0
                                && m.senderType === message.senderType
                                && m.message === message.message
                        );
                        if (optimisticIndex !== -1) {
                            console.log('✅ [ChatBox] Replacing optimistic message with real:', message.id);
                            const updated = [...prev];
                            updated[optimisticIndex] = message;
                            return updated;
                        }
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
        // Đã có tin nhắn trong cache → không fetch lại
        if (messagesLoadedRef.current && messages.length > 0) {
            setTimeout(() => scrollToBottom(), 50);
            return;
        }
        try {
            const response = await chatService.getCustomerMessages(chatRoom.id, token, 0, 100);
            setMessages(response.content);
            messagesLoadedRef.current = true;
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
                    messagesLoadedRef.current = false; // reset cache
                    
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
        const text = inputMessage.trim();
        if (!text || !chatRoom) return;

        // Optimistic update: xóa input + thêm tin nhắn ngay lập tức
        setInputMessage('');
        const tempId = Date.now() * -1; // ID âm để phân biệt với ID thật
        const optimisticMsg: ChatMessage = {
            id: tempId,
            chatRoomId: chatRoom.id,
            senderType: 'CUSTOMER',
            senderId: customerId,
            senderName: customerName,
            message: text,
            messageType: 'TEXT',
            isRead: false,
            createdAt: new Date().toISOString(),
        };
        setMessages(prev => [...prev, optimisticMsg]);

        try {
            const request = {
                chatRoomId: chatRoom.id,
                senderType: 'CUSTOMER' as const,
                senderId: customerId,
                message: text,
                messageType: 'TEXT' as const,
            };
            const sentMessage = await chatService.sendCustomerMessage(request, token);
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
        if (!file || !chatRoom) return;

        // Validate image
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
        
        // Reset file input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const compressImage = async (file: File): Promise<File> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target?.result as string;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    
                    // Max dimension 1920px (good quality, reasonable size)
                    const maxDimension = 1920;
                    if (width > maxDimension || height > maxDimension) {
                        if (width > height) {
                            height = (height / width) * maxDimension;
                            width = maxDimension;
                        } else {
                            width = (width / height) * maxDimension;
                            height = maxDimension;
                        }
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);
                    
                    // Convert to WebP with 85% quality (best balance)
                    canvas.toBlob(
                        (blob) => {
                            if (blob) {
                                const compressedFile = new File([blob], file.name.replace(/\.[^.]+$/, '.webp'), {
                                    type: 'image/webp',
                                    lastModified: Date.now(),
                                });
                                resolve(compressedFile);
                            } else {
                                reject(new Error('Compression failed'));
                            }
                        },
                        'image/webp',
                        0.85
                    );
                };
                img.onerror = reject;
            };
            reader.onerror = reject;
        });
    };

    const handleConfirmImage = async () => {
        if (!imagePreview || !chatRoom) return;

        try {
            setIsUploading(true);
            
            // Compress image before upload (faster upload + less storage)
            console.log('Original size:', (imagePreview.file.size / 1024 / 1024).toFixed(2), 'MB');
            const compressedFile = await compressImage(imagePreview.file);
            console.log('Compressed size:', (compressedFile.size / 1024 / 1024).toFixed(2), 'MB');
            
            // Upload compressed image to MinIO
            const uploadResult = await chatService.uploadChatImage(compressedFile, token);
            
            // Send image message
            const request = {
                chatRoomId: chatRoom.id,
                senderType: 'CUSTOMER' as const,
                senderId: customerId,
                message: '',
                messageType: 'IMAGE' as const,
                attachmentUrl: uploadResult.url,
            };

            const sentMessage = await chatService.sendCustomerMessage(request, token);
            
            // Add message to UI immediately
            setMessages(prev => [...prev, sentMessage]);
            
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
                    className="fixed bottom-6 left-4 sm:bottom-6 sm:right-6 sm:left-auto bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-full p-3 sm:p-4 shadow-2xl hover:shadow-green-400/50 transition-all duration-300 z-50 group hover:scale-110"
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
                    <span className="absolute left-16 top-1/2 -translate-y-1/2 bg-gray-900 text-white px-3 py-2 rounded-lg text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none sm:left-auto sm:right-16">
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
                                            const isMenuOpen = openMenuId === message.id;
                                            const isEditing = editingId === message.id;

                                            return (
                                                <div key={message.id}>
                                                    {/* Hàng chính: bubble + nút 3 chấm */}
                                                    <div className={`flex items-start gap-1.5 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                                                        {/* Nút 3 chấm bên trái bubble (cho tin nhắn bên phải) hoặc bên phải (cho tin nhắn bên trái) */}
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
                                                                ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white'
                                                                : 'bg-gradient-to-br from-purple-500 to-indigo-600 text-white'
                                                        } ${message.id < 0 ? 'opacity-60' : ''}`}>
                                                            {!isOwnMessage && message.senderName && (
                                                                <p className="text-xs font-bold text-white mb-1.5">
                                                                    {message.senderName || 'Nhân viên hỗ trợ'}
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
