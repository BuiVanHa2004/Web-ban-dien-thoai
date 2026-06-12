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
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ChatService {
    
    private final SupportChatRoomRepository chatRoomRepository;
    private final SupportChatMessageRepository chatMessageRepository;
    private final com.webbanhang.shop.Repository.Customers.CustomerAccountRepository customerAccountRepository;
    private final com.webbanhang.shop.Repository.Admins.AdminAccountRepository adminAccountRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final com.webbanhang.shop.Service.Storage.MinioStorageService minioStorageService;

    @Transactional
    public ChatRoomDTO getOrCreateChatRoom(Long customerId) {
        CustomerAccount customer = customerAccountRepository.findById(customerId.intValue())
            .orElseThrow(() -> new RuntimeException("Customer not found"));

        // MESSENGER PRINCIPLE: 1 Customer = 1 ChatRoom FOREVER
        // Find ANY room for this customer (ACTIVE or CLOSED)
        List<ChatRoom> allRooms = chatRoomRepository.findByCustomerId(customerId, Pageable.unpaged()).getContent();
        
        final ChatRoom chatRoom; // Make final for lambda usage
        
        if (!allRooms.isEmpty()) {
            // Room exists - reuse it (even if CLOSED)
            ChatRoom selectedRoom = allRooms.stream()
                .filter(r -> r.getStatus() == ChatRoomStatus.ACTIVE)
                .findFirst()
                .orElse(allRooms.get(0)); // If all closed, take first and reactivate
            
            // Reactivate if closed
            if (selectedRoom.getStatus() == ChatRoomStatus.CLOSED) {
                log.info("🔄 Reactivating closed chat room: {} for customer: {}", selectedRoom.getId(), customerId);
                selectedRoom.setStatus(ChatRoomStatus.ACTIVE);
                selectedRoom.setLastMessageAt(LocalDateTime.now());
                selectedRoom = chatRoomRepository.save(selectedRoom);
            } else {
                log.info("✅ Found existing ACTIVE chat room: {} for customer: {}", selectedRoom.getId(), customerId);
            }
            
            // CRITICAL: Close ALL other ACTIVE rooms (DUPLICATE PROTECTION)
            final Long keepRoomId = selectedRoom.getId();
            long duplicateCount = allRooms.stream()
                .filter(r -> r.getStatus() == ChatRoomStatus.ACTIVE && !r.getId().equals(keepRoomId))
                .count();
            
            if (duplicateCount > 0) {
                log.error("⚠️ CRITICAL: Found {} duplicate ACTIVE rooms for customer: {}. Fixing...", duplicateCount, customerId);
                allRooms.stream()
                    .filter(r -> r.getStatus() == ChatRoomStatus.ACTIVE && !r.getId().equals(keepRoomId))
                    .forEach(r -> {
                        r.setStatus(ChatRoomStatus.CLOSED);
                        chatRoomRepository.save(r);
                        log.info("🗑️ Closed duplicate ACTIVE room: {}", r.getId());
                    });
            }
            
            chatRoom = selectedRoom;
        } else {
            // No room exists - create NEW one (first time only)
            ChatRoom newRoom = new ChatRoom();
            newRoom.setCustomer(customer);
            newRoom.setStatus(ChatRoomStatus.ACTIVE);
            newRoom.setLastMessageAt(LocalDateTime.now());
            
            // DUPLICATE PROTECTION: Check again before save
            List<ChatRoom> checkDuplicate = chatRoomRepository.findByCustomerIdAndStatusPaged(
                customerId, 
                ChatRoomStatus.ACTIVE, 
                PageRequest.of(0, 1)
            ).getContent();
            
            if (!checkDuplicate.isEmpty()) {
                log.warn("⚠️ Race condition detected: Room created while checking. Using existing room.");
                chatRoom = checkDuplicate.get(0);
            } else {
                chatRoom = chatRoomRepository.save(newRoom);
                log.info("✅ Created NEW chat room: {} for customer: {}", chatRoom.getId(), customerId);
            }
        }

        return convertToChatRoomDTO(chatRoom);
    }

    @Transactional
    public ChatMessageDTO sendMessage(SendMessageRequest request) {
        ChatRoom chatRoom = chatRoomRepository.findById(request.getChatRoomId())
            .orElseThrow(() -> new RuntimeException("Chat room not found"));

        // MESSENGER STYLE DELETE LOGIC:
        // When Admin sends message → Customer sees chat again (but FILTERED by timestamp)
        // When Customer sends message → Admin sees chat again (but FILTERED by timestamp)
        // 
        // CRITICAL: DO NOT set deleted_at = NULL
        // Keep timestamp to filter old messages
        
        if (request.getSenderType() == SenderType.CUSTOMER) {
            // Customer sent message
            if (chatRoom.getAdminDeletedAt() != null) {
                log.info("✅ Customer sent message → Admin will see chat again (but only messages after {})", 
                    chatRoom.getAdminDeletedAt());
                // Admin deleted chat → keep timestamp, just make chat visible
            }
        } else if (request.getSenderType() == SenderType.ADMIN) {
            // Admin sent message
            if (chatRoom.getCustomerDeletedAt() != null) {
                log.info("✅ Admin sent message → Customer will see chat again (but only messages after {})", 
                    chatRoom.getCustomerDeletedAt());
                // Customer deleted chat → keep timestamp, just make chat visible
            }
        }
        
        // IMPORTANT: Do NOT modify deleted_at timestamps
        // They are used for filtering messages, not hiding chat

        // Create and save message
        ChatMessage message = new ChatMessage();
        message.setChatRoom(chatRoom);
        message.setSenderType(request.getSenderType());
        message.setSenderId(request.getSenderId());
        message.setMessage(request.getMessage());
        message.setMessageType(request.getMessageType() != null ? request.getMessageType() : MessageType.TEXT);
        message.setAttachmentUrl(request.getAttachmentUrl());
        message.setIsRead(false);
        message.setReadAt(null);
        
        message = chatMessageRepository.save(message);

        // Update last message preview
        String lastMessagePreview = message.getMessageType() == MessageType.IMAGE ? "📷 Hình ảnh" : request.getMessage();
        chatRoom.setLastMessageAt(LocalDateTime.now());
        chatRoom.setLastMessage(truncateMessage(lastMessagePreview, 100));
        chatRoom.setLastMessageSenderType(request.getSenderType());
        chatRoomRepository.save(chatRoom);

        ChatMessageDTO messageDTO = convertToChatMessageDTO(message);

        messagingTemplate.convertAndSend("/topic/chat/" + chatRoom.getId(), messageDTO);
        
        if (request.getSenderType() == SenderType.CUSTOMER) {
            messagingTemplate.convertAndSend("/topic/admin/new-message", messageDTO);
            log.info("✅ Notified admins about new message from customer in room: {}", chatRoom.getId());
        }

        return messageDTO;
    }

    public Page<ChatMessageDTO> getChatMessages(Long chatRoomId, int page, int size) {
        ChatRoom chatRoom = chatRoomRepository.findById(chatRoomId)
            .orElseThrow(() -> new RuntimeException("Chat room not found"));
        
        Pageable pageable = PageRequest.of(page, size);
        Page<ChatMessage> messages;
        
        // BUG 2 FIX: Load messages after delete timestamp based on caller
        // This method is called by both admin and customer endpoints
        // We need context to know which deleted_at to check
        // For now, load all messages (caller will filter in controller)
        messages = chatMessageRepository.findByChatRoomIdOrderByCreatedAtAsc(chatRoomId, pageable);
        
        return messages.map(this::convertToChatMessageDTO);
    }
    
    // BUG 2 FIX: Separate methods for customer and admin with proper filtering
    public Page<ChatMessageDTO> getCustomerChatMessages(Long chatRoomId, int page, int size) {
        ChatRoom chatRoom = chatRoomRepository.findById(chatRoomId)
            .orElseThrow(() -> new RuntimeException("Chat room not found"));
        
        Pageable pageable = PageRequest.of(page, size);
        Page<ChatMessage> messages;
        
        if (chatRoom.getCustomerDeletedAt() != null) {
            // Customer deleted - only load messages after delete timestamp AND not deleted by customer
            log.info("📋 Customer view: Loading messages after {} (excluding deleted)", chatRoom.getCustomerDeletedAt());
            messages = chatMessageRepository.findByChatRoomIdAfterTimestampForCustomer(
                chatRoomId, 
                chatRoom.getCustomerDeletedAt(), 
                pageable
            );
        } else {
            // No chat deletion - load all messages not deleted by customer
            messages = chatMessageRepository.findByChatRoomIdForCustomer(chatRoomId, pageable);
        }
        
        return messages.map(this::convertToChatMessageDTO);
    }
    
    public Page<ChatMessageDTO> getAdminChatMessages(Long chatRoomId, int page, int size) {
        ChatRoom chatRoom = chatRoomRepository.findById(chatRoomId)
            .orElseThrow(() -> new RuntimeException("Chat room not found"));
        
        Pageable pageable = PageRequest.of(page, size);
        Page<ChatMessage> messages;
        
        if (chatRoom.getAdminDeletedAt() != null) {
            // Admin deleted - only load messages after delete timestamp AND not deleted by admin
            log.info("📋 Admin view: Loading messages after {} (excluding deleted)", chatRoom.getAdminDeletedAt());
            messages = chatMessageRepository.findByChatRoomIdAfterTimestampForAdmin(
                chatRoomId, 
                chatRoom.getAdminDeletedAt(), 
                pageable
            );
        } else {
            // No chat deletion - load all messages not deleted by admin
            messages = chatMessageRepository.findByChatRoomIdForAdmin(chatRoomId, pageable);
        }
        
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
        // MESSENGER STYLE: Show rooms with NEW messages after admin deleted OR not deleted
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

    /**
     * EDIT MESSAGE - Only TEXT messages can be edited
     * Người gửi chỉnh sửa tin nhắn, hiển thị "(đã chỉnh sửa)"
     */
    @Transactional
    public ChatMessageDTO editMessage(Long messageId, String newMessage) {
        ChatMessage message = chatMessageRepository.findById(messageId)
            .orElseThrow(() -> new RuntimeException("Message not found"));
        
        // Validation: Only TEXT messages can be edited
        if (message.getMessageType() != MessageType.TEXT) {
            throw new RuntimeException("Only text messages can be edited");
        }
        
        // Validation: Cannot edit recalled messages
        if (Boolean.TRUE.equals(message.getRecalled())) {
            throw new RuntimeException("Cannot edit recalled messages");
        }
        
        Long chatRoomId = message.getChatRoom().getId();
        
        // Update message
        message.setMessage(newMessage);
        message.setEdited(true);
        message.setEditedAt(LocalDateTime.now());
        message = chatMessageRepository.save(message);
        
        log.info("✏️ Message {} edited by user", messageId);
        
        // Broadcast edit event via WebSocket
        ChatMessageDTO editedMessageDTO = convertToChatMessageDTO(message);
        messagingTemplate.convertAndSend("/topic/chat/" + chatRoomId, editedMessageDTO);
        log.info("📡 Broadcasted edit event for message {} to room {}", messageId, chatRoomId);
        
        return editedMessageDTO;
    }
    
    /**
     * RECALL MESSAGE (THU HỒI) - Both sides see "Tin nhắn đã được thu hồi"
     * Cả admin và customer đều thấy tin nhắn đã thu hồi
     * Images are deleted from MinIO
     */
    @Transactional
    public ChatMessageDTO recallMessage(Long messageId) {
        ChatMessage message = chatMessageRepository.findById(messageId)
            .orElseThrow(() -> new RuntimeException("Message not found"));
        
        Long chatRoomId = message.getChatRoom().getId();
        
        // If message has image attachment, delete from MinIO
        if (message.getMessageType() == MessageType.IMAGE && message.getAttachmentUrl() != null) {
            try {
                log.info("🗑️ Deleting image from MinIO: {}", message.getAttachmentUrl());
                minioStorageService.deleteByUrl(message.getAttachmentUrl());
                log.info("✅ Image deleted from MinIO successfully");
            } catch (Exception e) {
                log.error("❌ Failed to delete image from MinIO: {}", e.getMessage());
            }
        }
        
        // Mark as recalled
        message.setMessage("Tin nhắn đã được thu hồi");
        message.setMessageType(MessageType.TEXT);
        message.setAttachmentUrl(null);
        message.setRecalled(true);
        message.setRecalledAt(LocalDateTime.now());
        message = chatMessageRepository.save(message);
        
        log.info("🔙 Message {} recalled", messageId);
        
        // Broadcast recall event via WebSocket
        ChatMessageDTO recalledMessageDTO = convertToChatMessageDTO(message);
        messagingTemplate.convertAndSend("/topic/chat/" + chatRoomId, recalledMessageDTO);
        log.info("📡 Broadcasted recall event for message {} to room {}", messageId, chatRoomId);
        
        return recalledMessageDTO;
    }
    
    /**
     * DELETE MESSAGE (XÓA CHỈ Ở PHÍA NGƯỜI XÓA)
     * Messenger style: Independent delete for each user
     * Người xóa không thấy, người còn lại vẫn thấy
     * CAN delete without recalling first
     */
    @Transactional
    public void deleteMessageForUser(Long messageId, SenderType deleterType) {
        ChatMessage message = chatMessageRepository.findById(messageId)
            .orElseThrow(() -> new RuntimeException("Message not found"));
        
        // Mark as deleted for specific user (no validation needed)
        if (deleterType == SenderType.ADMIN) {
            message.setDeletedForAdmin(true);
        } else {
            message.setDeletedForCustomer(true);
        }
        
        chatMessageRepository.save(message);
        log.info("🗑️ Message {} marked as deleted for {}", messageId, deleterType);
        
        // NOTE: NO WebSocket broadcast - delete is local to user's UI only
        // Other side still sees the message
    }
    
    /**
     * DEPRECATED: Use recallMessage() instead
     */
    @Deprecated
    @Transactional
    public void deleteMessage(Long messageId) {
        log.warn("⚠️ DEPRECATED: deleteMessage() called, use recallMessage() instead");
        recallMessage(messageId);
    }

    /**
     * MESSENGER STYLE: Delete chat for one side only (Admin or Customer)
     * Does NOT physically delete messages from database.
     * Other side still sees full history.
     * 
     * MinIO Cleanup: If BOTH sides have deleted, cleanup all images
     */
    @Transactional
    public void deleteChatRoomForAdmin(Long chatRoomId) {
        ChatRoom chatRoom = chatRoomRepository.findById(chatRoomId)
            .orElseThrow(() -> new RuntimeException("Chat room not found"));
        
        chatRoom.setAdminDeletedAt(LocalDateTime.now());
        chatRoomRepository.save(chatRoom);
        
        log.info("🗑️ Admin deleted chat room: {} (Customer still sees it)", chatRoomId);
        
        // Check if BOTH sides have deleted → cleanup MinIO images
        if (chatRoom.getCustomerDeletedAt() != null && chatRoom.getAdminDeletedAt() != null) {
            cleanupMinIOImagesForChatRoom(chatRoomId);
        }
    }

    /**
     * MESSENGER STYLE: Delete chat for Customer only
     * Does NOT physically delete messages from database.
     * Admin side still sees full history.
     * 
     * MinIO Cleanup: If BOTH sides have deleted, cleanup all images
     */
    @Transactional
    public void deleteChatRoomForCustomer(Long chatRoomId) {
        ChatRoom chatRoom = chatRoomRepository.findById(chatRoomId)
            .orElseThrow(() -> new RuntimeException("Chat room not found"));
        
        chatRoom.setCustomerDeletedAt(LocalDateTime.now());
        chatRoomRepository.save(chatRoom);
        
        log.info("🗑️ Customer deleted chat room: {} (Admin still sees it)", chatRoomId);
        
        // Check if BOTH sides have deleted → cleanup MinIO images
        if (chatRoom.getCustomerDeletedAt() != null && chatRoom.getAdminDeletedAt() != null) {
            cleanupMinIOImagesForChatRoom(chatRoomId);
        }
    }
    
    /**
     * Cleanup all images in a chat room from MinIO
     * Only called when BOTH Customer and Admin have deleted the chat
     */
    private void cleanupMinIOImagesForChatRoom(Long chatRoomId) {
        try {
            log.info("🧹 BOTH SIDES DELETED → Cleaning up MinIO images for chat room: {}", chatRoomId);
            List<ChatMessage> allMessages = chatMessageRepository.findByChatRoomIdOrderByCreatedAtAsc(
                chatRoomId, 
                Pageable.unpaged()
            ).getContent();
            
            int imageCount = 0;
            for (ChatMessage message : allMessages) {
                if (message.getMessageType() == MessageType.IMAGE && message.getAttachmentUrl() != null) {
                    try {
                        log.info("🗑️ Deleting image from MinIO: {}", message.getAttachmentUrl());
                        minioStorageService.deleteByUrl(message.getAttachmentUrl());
                        imageCount++;
                    } catch (Exception e) {
                        log.error("❌ Failed to delete image from MinIO: {}", e.getMessage());
                        // Continue deleting other images
                    }
                }
            }
            log.info("✅ Cleaned up {} images from MinIO in chat room: {}", imageCount, chatRoomId);
        } catch (Exception e) {
            log.error("❌ Error during MinIO cleanup for chat room {}: {}", chatRoomId, e.getMessage());
        }
    }

    /**
     * DEPRECATED: Do NOT use this for independent delete
     * This physically deletes messages from database
     * Use deleteChatRoomForAdmin or deleteChatRoomForCustomer instead
     * 
     * WARNING: This also deletes all images from MinIO
     */
    @Deprecated
    @Transactional
    public void deleteAllMessages(Long chatRoomId) {
        // Verify chat room exists
        chatRoomRepository.findById(chatRoomId)
            .orElseThrow(() -> new RuntimeException("Chat room not found"));
        
        // CRITICAL: Delete all images from MinIO before deleting messages
        try {
            log.info("🗑️ Fetching all messages with images in chat room: {}", chatRoomId);
            List<ChatMessage> allMessages = chatMessageRepository.findByChatRoomIdOrderByCreatedAtAsc(
                chatRoomId, 
                Pageable.unpaged()
            ).getContent();
            
            int imageCount = 0;
            for (ChatMessage message : allMessages) {
                if (message.getMessageType() == MessageType.IMAGE && message.getAttachmentUrl() != null) {
                    try {
                        log.info("🗑️ Deleting image from MinIO: {}", message.getAttachmentUrl());
                        minioStorageService.deleteByUrl(message.getAttachmentUrl());
                        imageCount++;
                    } catch (Exception e) {
                        log.error("❌ Failed to delete image from MinIO: {}", e.getMessage());
                        // Continue deleting other images
                    }
                }
            }
            log.info("✅ Deleted {} images from MinIO in chat room: {}", imageCount, chatRoomId);
        } catch (Exception e) {
            log.error("❌ Error during MinIO cleanup for chat room {}: {}", chatRoomId, e.getMessage());
            // Continue with message deletion even if MinIO cleanup fails
        }
        
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
        dto.setEdited(message.getEdited());
        dto.setEditedAt(message.getEditedAt());
        dto.setRecalled(message.getRecalled());
        dto.setRecalledAt(message.getRecalledAt());
        dto.setDeletedForAdmin(message.getDeletedForAdmin());
        dto.setDeletedForCustomer(message.getDeletedForCustomer());
        dto.setMessageType(message.getMessageType());
        dto.setAttachmentUrl(message.getAttachmentUrl());
        dto.setIsRead(message.getIsRead());
        dto.setCreatedAt(message.getCreatedAt());

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
