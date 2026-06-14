import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

const BASE_URL = process.env.NEXT_PUBLIC_URL || 'http://localhost:8080';
const API_URL = `${BASE_URL}/api`;
// SockJS requires http/https URL (not wss://) — it upgrades to WebSocket internally
const WS_URL_RAW = process.env.NEXT_PUBLIC_WS_URL || `${BASE_URL}/ws-chat`;
const WS_URL = WS_URL_RAW.replace(/^wss:\/\//, 'https://').replace(/^ws:\/\//, 'http://');

export interface ChatMessage {
    id: number;
    chatRoomId: number;
    senderType: 'CUSTOMER' | 'ADMIN';
    senderId: number;
    senderName: string;
    senderAvatar?: string;
    message: string;
    edited?: boolean;
    editedAt?: string;
    recalled?: boolean;
    recalledAt?: string;
    deletedForAdmin?: boolean;
    deletedForCustomer?: boolean;
    messageType: 'TEXT' | 'IMAGE' | 'FILE' | 'SYSTEM';
    attachmentUrl?: string;
    isRead: boolean;
    createdAt: string;
}

export interface ChatRoom {
    id: number;
    customerId: number;
    customerName: string;
    customerAvatar?: string;
    customerEmail: string;
    adminId?: number;
    adminName?: string;
    adminAvatar?: string;
    status: 'ACTIVE' | 'CLOSED' | 'ARCHIVED';
    createdAt: string;
    updatedAt: string;
    lastMessageAt: string;
    lastMessage?: string;
    unreadCount: number;
}

export interface SendMessageRequest {
    chatRoomId: number;
    senderType: 'CUSTOMER' | 'ADMIN';
    senderId: number;
    message: string;
    messageType?: 'TEXT' | 'IMAGE' | 'FILE' | 'SYSTEM';
    attachmentUrl?: string;
}

class ChatService {
    private stompClient: Client | null = null;
    private subscriptions: Map<string, any> = new Map();

    // Customer APIs
    async getOrCreateChatRoom(customerId: number, token: string): Promise<ChatRoom> {
        try {
            const response = await fetch(`${API_URL}/customer/chat/room?customerId=${customerId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Chat room creation failed:', response.status, errorText);
                throw new Error(`Failed to get or create chat room: ${response.status} - ${errorText}`);
            }
            
            return response.json();
        } catch (error) {
            console.error('Error in getOrCreateChatRoom:', error);
            throw error;
        }
    }

    async getCustomerMessages(chatRoomId: number, token: string, page = 0, size = 50): Promise<{ content: ChatMessage[], totalElements: number }> {
        const response = await fetch(`${API_URL}/customer/chat/messages/${chatRoomId}?page=${page}&size=${size}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
        if (!response.ok) throw new Error('Failed to get messages');
        return response.json();
    }

    async sendCustomerMessage(request: SendMessageRequest, token: string): Promise<ChatMessage> {
        const response = await fetch(`${API_URL}/customer/chat/send`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(request),
        });
        if (!response.ok) throw new Error('Failed to send message');
        return response.json();
    }

    async uploadChatImage(file: File, token: string): Promise<{ url: string }> {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch(`${API_URL}/uploads/chat-images`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
            body: formData,
        });
        
        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Upload failed' }));
            throw new Error(error.message || 'Không thể upload ảnh');
        }
        
        return response.json();
    }

    async markAdminMessagesAsRead(chatRoomId: number, token: string): Promise<void> {
        await fetch(`${API_URL}/customer/chat/read/${chatRoomId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
    }

    async getCustomerUnreadCount(chatRoomId: number, token: string): Promise<number> {
        const response = await fetch(`${API_URL}/customer/chat/unread/${chatRoomId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
        if (!response.ok) throw new Error('Failed to get unread count');
        return response.json();
    }

    async deleteMessage(messageId: number, token: string): Promise<void> {
        const response = await fetch(`${API_URL}/chat/messages/${messageId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Delete message failed:', response.status, errorText);
            throw new Error(`Failed to delete message: ${response.status} - ${errorText}`);
        }
    }

    /**
     * EDIT MESSAGE - Chỉnh sửa tin nhắn TEXT
     */
    async editMessage(messageId: number, newMessage: string, token: string): Promise<ChatMessage> {
        const response = await fetch(`${API_URL}/chat/messages/${messageId}/edit`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ messageId, newMessage }),
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Edit message failed:', response.status, errorText);
            throw new Error(`Failed to edit message: ${response.status} - ${errorText}`);
        }
        
        return response.json();
    }

    /**
     * RECALL MESSAGE - Thu hồi tin nhắn (cả hai bên thấy)
     */
    async recallMessage(messageId: number, token: string): Promise<ChatMessage> {
        const response = await fetch(`${API_URL}/chat/messages/${messageId}/recall`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Recall message failed:', response.status, errorText);
            throw new Error(`Failed to recall message: ${response.status} - ${errorText}`);
        }
        
        return response.json();
    }

    /**
     * DELETE MESSAGE FOR ME - Xóa tin nhắn chỉ ở phía người xóa
     */
    async deleteMessageForMe(messageId: number, deleterType: 'ADMIN' | 'CUSTOMER', token: string): Promise<void> {
        const response = await fetch(`${API_URL}/chat/messages/${messageId}/delete-for-me`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ messageId, deleterType }),
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Delete message for me failed:', response.status, errorText);
            throw new Error(`Failed to delete message: ${response.status} - ${errorText}`);
        }
    }

    /**
     * MESSENGER STYLE: Delete chat room for admin (Customer still sees it)
     */
    async deleteAdminChatRoom(chatRoomId: number, token: string): Promise<void> {
        const response = await fetch(`${API_URL}/admin/chat/rooms/${chatRoomId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Delete admin chat room failed:', response.status, errorText);
            throw new Error(`Failed to delete chat room: ${response.status} - ${errorText}`);
        }
    }

    /**
     * MESSENGER STYLE: Delete chat room for customer (Admin still sees it)
     */
    async deleteCustomerChatRoom(chatRoomId: number, token: string): Promise<void> {
        const response = await fetch(`${API_URL}/customer/chat/rooms/${chatRoomId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Delete customer chat room failed:', response.status, errorText);
            throw new Error(`Failed to delete chat room: ${response.status} - ${errorText}`);
        }
    }

    /**
     * DEPRECATED: Physical delete of all messages
     */
    async deleteChatRoomMessages(chatRoomId: number, token: string): Promise<void> {
        const response = await fetch(`${API_URL}/chat/rooms/${chatRoomId}/messages`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Delete chat room messages failed:', response.status, errorText);
            throw new Error(`Failed to delete chat room messages: ${response.status} - ${errorText}`);
        }
    }

    // Admin APIs
    async getAdminChatRooms(token: string, page = 0, size = 20): Promise<{ content: ChatRoom[], totalElements: number }> {
        const response = await fetch(`${API_URL}/admin/chat/rooms?page=${page}&size=${size}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
        if (!response.ok) throw new Error('Failed to get chat rooms');
        return response.json();
    }

    async getAdminMessages(chatRoomId: number, token: string, page = 0, size = 50): Promise<{ content: ChatMessage[], totalElements: number }> {
        const response = await fetch(`${API_URL}/admin/chat/messages/${chatRoomId}?page=${page}&size=${size}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
        if (!response.ok) throw new Error('Failed to get messages');
        return response.json();
    }

    async sendAdminMessage(request: SendMessageRequest, token: string): Promise<ChatMessage> {
        const response = await fetch(`${API_URL}/admin/chat/send`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(request),
        });
        if (!response.ok) throw new Error('Failed to send message');
        return response.json();
    }

    async markCustomerMessagesAsRead(chatRoomId: number, token: string): Promise<void> {
        await fetch(`${API_URL}/admin/chat/read/${chatRoomId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
    }

    async getAdminUnreadCount(chatRoomId: number, token: string): Promise<number> {
        const response = await fetch(`${API_URL}/admin/chat/unread/${chatRoomId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
        if (!response.ok) throw new Error('Failed to get unread count');
        return response.json();
    }

    async assignAdminToChatRoom(chatRoomId: number, adminId: number, token: string): Promise<ChatRoom> {
        const response = await fetch(`${API_URL}/admin/chat/assign/${chatRoomId}?adminId=${adminId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
        if (!response.ok) throw new Error('Failed to assign admin');
        return response.json();
    }

    async closeChatRoom(chatRoomId: number, token: string): Promise<void> {
        await fetch(`${API_URL}/admin/chat/close/${chatRoomId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
    }

    async getUnassignedChatRoomsCount(token: string): Promise<number> {
        const response = await fetch(`${API_URL}/admin/chat/unassigned-count`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
        if (!response.ok) throw new Error('Failed to get unassigned count');
        return response.json();
    }

    // WebSocket connection
    connectWebSocket(
        onMessageReceived: (message: ChatMessage) => void, 
        chatRoomId?: number,
        onConnected?: () => void
    ): void {
        if (this.stompClient?.connected) {
            console.log('✅ [ChatService] Already connected');
            // Nếu đã connected, subscribe ngay
            if (chatRoomId) {
                this.subscribeToChat(chatRoomId, onMessageReceived);
            }
            // Gọi onConnected callback nếu có
            if (onConnected) {
                onConnected();
            }
            return;
        }

        const socket = new SockJS(WS_URL);
        this.stompClient = new Client({
            webSocketFactory: () => socket as any,
            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,
            debug: (str) => {
                console.log('STOMP:', str);
            }
        });

        this.stompClient.onConnect = () => {
            console.log('✅ [ChatService] WebSocket connected successfully');
            if (chatRoomId) {
                console.log('🔌 [ChatService] Subscribing to chat room:', chatRoomId);
                this.subscribeToChat(chatRoomId, onMessageReceived);
            }
            // Gọi onConnected callback khi connection sẵn sàng
            if (onConnected) {
                console.log('🔔 [ChatService] Calling onConnected callback');
                onConnected();
            }
        };

        this.stompClient.onStompError = (frame) => {
            console.error('STOMP error:', frame);
        };
        
        this.stompClient.onWebSocketError = (event) => {
            console.error('WebSocket error:', event);
        };

        this.stompClient.activate();
    }

    subscribeToChat(chatRoomId: number, onMessageReceived: (message: ChatMessage) => void): void {
        if (!this.stompClient) {
            console.error('❌ [ChatService] STOMP client not initialized');
            return;
        }

        // Check if connection is active
        if (!this.stompClient.connected) {
            console.warn('⏳ [ChatService] STOMP not connected yet, waiting...');
            setTimeout(() => {
                this.subscribeToChat(chatRoomId, onMessageReceived);
            }, 500);
            return;
        }

        const subscriptionId = `/topic/chat/${chatRoomId}`;
        
        if (this.subscriptions.has(subscriptionId)) {
            console.log('✅ [ChatService] Already subscribed to chat room:', chatRoomId);
            return;
        }

        try {
            const subscription = this.stompClient.subscribe(subscriptionId, (message) => {
                console.log('📩 [ChatService] *** MESSAGE RECEIVED for room', chatRoomId, '***', message.body);
                const chatMessage = JSON.parse(message.body);
                onMessageReceived(chatMessage);
            });

            this.subscriptions.set(subscriptionId, subscription);
            console.log('✅ [ChatService] Successfully subscribed to chat room:', chatRoomId);
        } catch (error) {
            console.error('❌ [ChatService] Failed to subscribe to chat room:', error);
        }
    }

    subscribeToAdminNotifications(onNewMessage: (message: ChatMessage) => void, retryCount = 0): void {
        if (!this.stompClient) {
            if (retryCount >= 10) {
                console.error('❌ [ChatService] Failed to subscribe to admin notifications after 10 retries - STOMP client not initialized');
                return;
            }
            console.warn(`⏳ [ChatService] STOMP client not ready for admin notifications, retry ${retryCount + 1}/10...`);
            setTimeout(() => {
                this.subscribeToAdminNotifications(onNewMessage, retryCount + 1);
            }, 500);
            return;
        }

        const subscriptionId = '/topic/admin/new-message';
        
        if (this.subscriptions.has(subscriptionId)) {
            console.log('✅ [ChatService] Already subscribed to admin notifications');
            return;
        }

        try {
            const subscription = this.stompClient.subscribe(subscriptionId, (message) => {
                console.log('📬 [ChatService] *** ADMIN NOTIFICATION RECEIVED ***', message.body);
                const chatMessage = JSON.parse(message.body);
                onNewMessage(chatMessage);
            });

            this.subscriptions.set(subscriptionId, subscription);
            console.log('✅ [ChatService] Successfully subscribed to admin notifications');
        } catch (error) {
            console.error('❌ [ChatService] Failed to subscribe to admin notifications:', error);
            // Retry on error
            if (retryCount < 10) {
                console.warn(`⏳ [ChatService] Retrying admin notification subscription ${retryCount + 1}/10...`);
                setTimeout(() => {
                    this.subscribeToAdminNotifications(onNewMessage, retryCount + 1);
                }, 500);
            }
        }
    }

    unsubscribeFromChat(chatRoomId: number): void {
        const subscriptionId = `/topic/chat/${chatRoomId}`;
        const subscription = this.subscriptions.get(subscriptionId);
        
        if (subscription) {
            subscription.unsubscribe();
            this.subscriptions.delete(subscriptionId);
        }
    }

    disconnectWebSocket(): void {
        this.subscriptions.forEach(subscription => subscription.unsubscribe());
        this.subscriptions.clear();
        
        if (this.stompClient) {
            this.stompClient.deactivate();
            this.stompClient = null;
        }
    }
}

export const chatService = new ChatService();
