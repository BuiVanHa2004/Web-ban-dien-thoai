package com.webbanhang.shop.Controller.Chats;

import com.webbanhang.shop.DTO.Chats.ChatMessageDTO;
import com.webbanhang.shop.DTO.Chats.ChatRoomDTO;
import com.webbanhang.shop.DTO.Chats.SendMessageRequest;
import com.webbanhang.shop.Model.Chats.SenderType;
import com.webbanhang.shop.Service.ChatService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;
    private final SimpMessagingTemplate messagingTemplate;

    // Customer endpoints
    @PostMapping("/customer/chat/room")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ChatRoomDTO> getOrCreateChatRoom(@RequestParam Long customerId) {
        ChatRoomDTO chatRoom = chatService.getOrCreateChatRoom(customerId);
        return ResponseEntity.ok(chatRoom);
    }

    @GetMapping("/customer/chat/messages/{chatRoomId}")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<Page<ChatMessageDTO>> getCustomerChatMessages(
            @PathVariable Long chatRoomId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        Page<ChatMessageDTO> messages = chatService.getCustomerChatMessages(chatRoomId, page, size);
        return ResponseEntity.ok(messages);
    }

    @PostMapping("/customer/chat/send")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ChatMessageDTO> sendCustomerMessage(@RequestBody SendMessageRequest request) {
        ChatMessageDTO message = chatService.sendMessage(request);
        return ResponseEntity.ok(message);
    }

    @PutMapping("/customer/chat/read/{chatRoomId}")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<Void> markAdminMessagesAsRead(@PathVariable Long chatRoomId) {
        chatService.markMessagesAsRead(chatRoomId, SenderType.ADMIN);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/customer/chat/unread/{chatRoomId}")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<Long> getCustomerUnreadCount(@PathVariable Long chatRoomId) {
        Long unreadCount = chatService.getUnreadCount(chatRoomId, SenderType.ADMIN);
        return ResponseEntity.ok(unreadCount);
    }

    // Admin endpoints
    @GetMapping("/admin/chat/rooms")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<Page<ChatRoomDTO>> getAdminChatRooms(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<ChatRoomDTO> chatRooms = chatService.getAdminChatRooms(page, size);
        return ResponseEntity.ok(chatRooms);
    }

    @GetMapping("/admin/chat/messages/{chatRoomId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<Page<ChatMessageDTO>> getAdminChatMessages(
            @PathVariable Long chatRoomId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        Page<ChatMessageDTO> messages = chatService.getAdminChatMessages(chatRoomId, page, size);
        return ResponseEntity.ok(messages);
    }

    @PostMapping("/admin/chat/send")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<ChatMessageDTO> sendAdminMessage(@RequestBody SendMessageRequest request) {
        ChatMessageDTO message = chatService.sendMessage(request);
        return ResponseEntity.ok(message);
    }

    @PutMapping("/admin/chat/read/{chatRoomId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<Void> markCustomerMessagesAsRead(@PathVariable Long chatRoomId) {
        chatService.markMessagesAsRead(chatRoomId, SenderType.CUSTOMER);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/admin/chat/unread/{chatRoomId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<Long> getAdminUnreadCount(@PathVariable Long chatRoomId) {
        Long unreadCount = chatService.getUnreadCount(chatRoomId, SenderType.CUSTOMER);
        return ResponseEntity.ok(unreadCount);
    }

    @PutMapping("/admin/chat/assign/{chatRoomId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<ChatRoomDTO> assignAdminToChatRoom(
            @PathVariable Long chatRoomId,
            @RequestParam Long adminId) {
        ChatRoomDTO chatRoom = chatService.assignAdminToChatRoom(chatRoomId, adminId);
        return ResponseEntity.ok(chatRoom);
    }

    @PutMapping("/admin/chat/close/{chatRoomId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<Void> closeChatRoom(@PathVariable Long chatRoomId) {
        chatService.closeChatRoom(chatRoomId);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/admin/chat/unassigned-count")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<Long> getUnassignedChatRoomsCount() {
        Long count = chatService.getUnassignedChatRoomsCount();
        return ResponseEntity.ok(count);
    }

    // Delete chat room - Messenger style (independent delete)
    @DeleteMapping("/admin/chat/rooms/{chatRoomId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<Void> deleteAdminChatRoom(@PathVariable Long chatRoomId) {
        chatService.deleteChatRoomForAdmin(chatRoomId);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/customer/chat/rooms/{chatRoomId}")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<Void> deleteCustomerChatRoom(@PathVariable Long chatRoomId) {
        chatService.deleteChatRoomForCustomer(chatRoomId);
        return ResponseEntity.ok().build();
    }

    // Delete single message (thu hồi tin nhắn)
    @DeleteMapping("/chat/messages/{messageId}")
    @PreAuthorize("hasAnyRole('CUSTOMER', 'ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<Void> deleteMessage(@PathVariable Long messageId) {
        chatService.deleteMessage(messageId);
        return ResponseEntity.ok().build();
    }
    
    // Edit message - Only sender can edit TEXT messages
    @PutMapping("/chat/messages/{messageId}/edit")
    @PreAuthorize("hasAnyRole('CUSTOMER', 'ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<ChatMessageDTO> editMessage(
            @PathVariable Long messageId,
            @RequestBody com.webbanhang.shop.DTO.Chats.EditMessageRequest request) {
        ChatMessageDTO editedMessage = chatService.editMessage(messageId, request.getNewMessage());
        return ResponseEntity.ok(editedMessage);
    }
    
    // Recall message - Both sides see "Tin nhắn đã được thu hồi"
    @PostMapping("/chat/messages/{messageId}/recall")
    @PreAuthorize("hasAnyRole('CUSTOMER', 'ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<ChatMessageDTO> recallMessage(@PathVariable Long messageId) {
        ChatMessageDTO recalledMessage = chatService.recallMessage(messageId);
        return ResponseEntity.ok(recalledMessage);
    }
    
    // Delete message for specific user (Messenger style)
    @PostMapping("/chat/messages/{messageId}/delete-for-me")
    @PreAuthorize("hasAnyRole('CUSTOMER', 'ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<Void> deleteMessageForMe(
            @PathVariable Long messageId,
            @RequestBody com.webbanhang.shop.DTO.Chats.DeleteMessageRequest request) {
        chatService.deleteMessageForUser(messageId, request.getDeleterType());
        return ResponseEntity.ok().build();
    }

    /**
     * DEPRECATED: Physical delete of all messages
     * Use DELETE /admin/chat/rooms/{chatRoomId} or /customer/chat/rooms/{chatRoomId} instead
     */
    @Deprecated
    @DeleteMapping("/chat/rooms/{chatRoomId}/messages")
    @PreAuthorize("hasAnyRole('CUSTOMER', 'ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<Void> deleteAllMessages(@PathVariable Long chatRoomId) {
        chatService.deleteAllMessages(chatRoomId);
        return ResponseEntity.ok().build();
    }

    // WebSocket endpoint for real-time messaging
    @MessageMapping("/chat.send")
    public void sendMessage(@Payload SendMessageRequest request) {
        ChatMessageDTO message = chatService.sendMessage(request);
        messagingTemplate.convertAndSend("/topic/chat/" + request.getChatRoomId(), message);
    }
}
