package com.webbanhang.shop.Service;

import com.webbanhang.shop.DTO.Chats.ChatMessageDTO;
import com.webbanhang.shop.DTO.Chats.ChatRoomDTO;
import com.webbanhang.shop.DTO.Chats.SendMessageRequest;
import com.webbanhang.shop.Model.Admins.AdminAccount;
import com.webbanhang.shop.Model.Chats.ChatMessage;
import com.webbanhang.shop.Model.Chats.ChatRoom;
import com.webbanhang.shop.Model.Chats.ChatRoomStatus;
import com.webbanhang.shop.Model.Chats.SenderType;
import com.webbanhang.shop.Model.Chats.MessageType;
import com.webbanhang.shop.Model.Customers.CustomerAccount;
import com.webbanhang.shop.Repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class ChatService {
    
    private final SupportChatRoomRepository chatRoomRepository;
    private final SupportChatMessageRepository chatMessageRepository;
    private final com.webbanhang.shop.Repository.Customers.CustomerAccountRepository customerAccountRepository;
    private final com.webbanhang.shop.Repository.Admins.AdminAccountRepository adminAccountRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional
    public ChatRoomDTO getOrCreateChatRoom(Long customerId) {
        CustomerAccount customer = customerAccountRepository.findById(customerId.intValue())
            .orElseThrow(() -> new RuntimeException("Customer not found"));

        // Find existing active room that customer hasn't deleted
        Optional<ChatRoom> existingRoom = chatRoomRepository.findByCustomerIdAndStatus(customerId, ChatRoomStatus.ACTIVE);
        
        ChatRoom chatRoom;
        if (existingRoom.isPresent()) {
            chatRoom = existingRoom.get();
            log.info("✅ Found existing chat room: {} for customer: {}", chatRoom.getId(), customerId);
        } else {
            // No active room found, create new one
            chatRoom = new ChatRoom();
            chatRoom.setCustomer(customer);
            chatRoom.setStatus(ChatRoomStatus.ACTIVE);
            chatRoom.setLastMessageAt(LocalDateTime.now());
            chatRoom = chatRoomRepository.save(chatRoom);
            log.info("✅ Created new chat room: {} for customer: {}", chatRoom.getId(), customerId);
        }

        return convertToChatRoomDTO(chatRoom);
    }

    @Transactional
    public ChatMessageDTO sendMessage(SendMessageRequest request) {
        ChatRoom chatRoom = chatRoomRepository.findById(request.getChatRoomId())
            .orElseThrow(() -> new RuntimeException("Chat room not found"));

        // MESSENGER LOGIC: When new message sent, restore chat for recipient
        if (request.getSenderType() == SenderType.CUSTOMER) {
            // Customer sends → Restore chat for Admin
            if (chatRoom.getAdminDeletedAt() != null) {
                log.info("🔄 Customer sent message, restoring chat for Admin in room: {}", chatRoom.getId());
                chatRoom.setAdminDeletedAt(null);
            }
        } else if (request.getSenderType() == SenderType.ADMIN) {
            // Admin sends → Restore chat for Customer
            if (chatRoom.getCustomerDeletedAt() != null) {
                log.info("🔄 Admin sent message, restoring chat for Customer in room: {}", chatRoom.getId());
                chatRoom.setCustomerDeletedAt(null);
            }
        }

        // Create and save message
        ChatMessage message = new ChatMessage();
        message.setChatRoom(chatRoom);
        message.setSenderType(request.getSenderType());
        message.setSenderId(request.getSenderId());
        message.setMessage(request.getMessage());
        message.setMessageType(MessageType.TEXT);
        message.setIsRead(false);
        message.setReadAt(null);
        
        message = chatMessageRepository.save(message);

        // Update last message info in chat room for fast preview
        chatRoom.setLastMessageAt(LocalDateTime.now());
        chatRoom.setLastMessage(truncateMessage(request.getMessage(), 100));
        chatRoom.setLastMessageSenderType(request.getSenderType());
        chatRoomRepository.save(chatRoom);

        ChatMessageDTO messageDTO = convertToChatMessageDTO(message);

        // Send real-time notification via WebSocket
        messagingTemplate.convertAndSend("/topic/chat/" + chatRoom.getId(), messageDTO);
        
        // Notify admins about new customer message (for notification badge)
        if (request.getSenderType() == SenderType.CUSTOMER) {
            messagingTemplate.convertAndSend("/topic/admin/new-message", messageDTO);
            log.info("✅ Notified admins about new message from customer in room: {}", chatRoom.getId());
        }

        return messageDTO;
    }

    public Page<ChatMessageDTO> getChatMessages(Long chatRoomId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<ChatMessage> messages = chatMessageRepository.findByChatRoomIdOrderByCreatedAtAsc(chatRoomId, pageable);
        return messages.map(this::convertToChatMessageDTO);
    }

    /**
     * Mark messages as read.
     * This should be called when user OPENS a conversation, not when sending a reply.
     * Returns the number of messages marked as read.
     */
    @Transactional
    public int markMessagesAsRead(Long chatRoomId, SenderType senderType) {
        try {
            // FIXED: Pass SenderType ENUM directly instead of String
            int updatedCount = chatMessageRepository.markMessagesAsRead(chatRoomId, senderType);
            log.info("✅ Marked {} messages as read for chatRoom: {}, senderType: {}", 
                updatedCount, chatRoomId, senderType);
            return updatedCount;
        } catch (Exception e) {
            log.error("❌ Error marking messages as read for chatRoom {}: {}", chatRoomId, e.getMessage(), e);
            throw e; // Re-throw to ensure transaction rollback
        }
    }

    public Page<ChatRoomDTO> getAdminChatRooms(int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<ChatRoom> chatRooms = chatRoomRepository.findByStatus(ChatRoomStatus.ACTIVE, pageable);
        return chatRooms.map(this::convertToChatRoomDTO);
    }

    @Transactional
    public ChatRoomDTO assignAdminToChatRoom(Long chatRoomId, Long adminId) {
        ChatRoom chatRoom = chatRoomRepository.findById(chatRoomId)
            .orElseThrow(() -> new RuntimeException("Chat room not found"));
        
        AdminAccount admin = adminAccountRepository.findById(adminId.intValue())
            .orElseThrow(() -> new RuntimeException("Admin not found"));

        chatRoom.setAdmin(admin);
        chatRoom = chatRoomRepository.save(chatRoom);

        return convertToChatRoomDTO(chatRoom);
    }

    @Transactional
    public void closeChatRoom(Long chatRoomId) {
        ChatRoom chatRoom = chatRoomRepository.findById(chatRoomId)
            .orElseThrow(() -> new RuntimeException("Chat room not found"));
        
        chatRoom.setStatus(ChatRoomStatus.CLOSED);
        chatRoomRepository.save(chatRoom);
    }

    public Long getUnassignedChatRoomsCount() {
        return chatRoomRepository.countUnassignedActiveRooms();
    }

    @Transactional
    public void deleteMessage(Long messageId) {
        // Soft delete: Update message content instead of deleting
        ChatMessage message = chatMessageRepository.findById(messageId)
            .orElseThrow(() -> new RuntimeException("Message not found"));
        message.setMessage("Tin nhắn đã thu hồi");
        chatMessageRepository.save(message);
    }

    /**
     * MESSENGER STYLE: Delete chat for one side only (Admin or Customer)
     * Does NOT physically delete messages from database.
     * Other side still sees full history.
     */
    @Transactional
    public void deleteChatRoomForAdmin(Long chatRoomId) {
        ChatRoom chatRoom = chatRoomRepository.findById(chatRoomId)
            .orElseThrow(() -> new RuntimeException("Chat room not found"));
        
        chatRoom.setAdminDeletedAt(LocalDateTime.now());
        chatRoomRepository.save(chatRoom);
        
        log.info("🗑️ Admin deleted chat room: {} (Customer still sees it)", chatRoomId);
    }

    /**
     * MESSENGER STYLE: Delete chat for Customer only
     * Does NOT physically delete messages from database.
     * Admin side still sees full history.
     */
    @Transactional
    public void deleteChatRoomForCustomer(Long chatRoomId) {
        ChatRoom chatRoom = chatRoomRepository.findById(chatRoomId)
            .orElseThrow(() -> new RuntimeException("Chat room not found"));
        
        chatRoom.setCustomerDeletedAt(LocalDateTime.now());
        chatRoomRepository.save(chatRoom);
        
        log.info("🗑️ Customer deleted chat room: {} (Admin still sees it)", chatRoomId);
    }

    /**
     * DEPRECATED: Do NOT use this for independent delete
     * This physically deletes messages from database
     * Use deleteChatRoomForAdmin or deleteChatRoomForCustomer instead
     */
    @Deprecated
    @Transactional
    public void deleteAllMessages(Long chatRoomId) {
        // Verify chat room exists
        chatRoomRepository.findById(chatRoomId)
            .orElseThrow(() -> new RuntimeException("Chat room not found"));
        
        // Bulk delete all messages in the chat room
        chatMessageRepository.deleteAllByChatRoomId(chatRoomId);
        
        log.warn("⚠️ DEPRECATED: Physical delete of messages in room: {}", chatRoomId);
    }

    /**
     * Get unread count for a specific sender type in a chat room.
     * This is used by frontend to display badge count.
     */
    public Long getUnreadCount(Long chatRoomId, SenderType senderType) {
        if (senderType == SenderType.CUSTOMER) {
            return chatMessageRepository.countUnreadCustomerMessages(chatRoomId);
        } else {
            return chatMessageRepository.countUnreadAdminMessages(chatRoomId);
        }
    }

    private ChatMessageDTO convertToChatMessageDTO(ChatMessage message) {
        ChatMessageDTO dto = new ChatMessageDTO();
        dto.setId(message.getId());
        dto.setChatRoomId(message.getChatRoom().getId());
        dto.setSenderType(message.getSenderType());
        dto.setSenderId(message.getSenderId());
        dto.setMessage(message.getMessage());
        dto.setIsRead(message.getIsRead());
        dto.setCreatedAt(message.getCreatedAt());

        // Set sender info
        if (message.getSenderType() == SenderType.CUSTOMER) {
            CustomerAccount customer = message.getChatRoom().getCustomer();
            dto.setSenderName(customer.getFullName());
            dto.setSenderAvatar(customer.getAvatarUrl());
        } else if (message.getSenderType() == SenderType.ADMIN) {
            AdminAccount admin = message.getChatRoom().getAdmin();
            if (admin != null) {
                dto.setSenderName(admin.getFullName());
                dto.setSenderAvatar(admin.getAvatarUrl());
            }
        }

        return dto;
    }

    private ChatRoomDTO convertToChatRoomDTO(ChatRoom chatRoom) {
        ChatRoomDTO dto = new ChatRoomDTO();
        dto.setId(chatRoom.getId());
        dto.setCustomerId(Long.valueOf(chatRoom.getCustomer().getCustomerId()));
        dto.setCustomerName(chatRoom.getCustomer().getFullName());
        dto.setCustomerAvatar(chatRoom.getCustomer().getAvatarUrl());
        dto.setCustomerEmail(chatRoom.getCustomer().getEmail());
        
        if (chatRoom.getAdmin() != null) {
            dto.setAdminId(Long.valueOf(chatRoom.getAdmin().getAccountId()));
            dto.setAdminName(chatRoom.getAdmin().getFullName());
            dto.setAdminAvatar(chatRoom.getAdmin().getAvatarUrl());
        }
        
        dto.setStatus(chatRoom.getStatus());
        dto.setCreatedAt(chatRoom.getCreatedAt());
        dto.setUpdatedAt(chatRoom.getUpdatedAt());
        dto.setLastMessageAt(chatRoom.getLastMessageAt());
        dto.setLastMessage(chatRoom.getLastMessage());
        dto.setLastMessageSenderType(chatRoom.getLastMessageSenderType());

        // Get real-time unread count from database
        Long unreadCount = chatMessageRepository.countUnreadCustomerMessages(chatRoom.getId());
        dto.setUnreadCount(unreadCount);

        return dto;
    }

    /**
     * Truncate message for preview (e.g., in chat room list)
     */
    private String truncateMessage(String message, int maxLength) {
        if (message == null) return null;
        if (message.length() <= maxLength) return message;
        return message.substring(0, maxLength) + "...";
    }
}
