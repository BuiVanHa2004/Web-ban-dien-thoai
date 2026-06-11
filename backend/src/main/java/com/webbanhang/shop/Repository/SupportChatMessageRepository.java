package com.webbanhang.shop.Repository;

import com.webbanhang.shop.Model.Chats.ChatMessage;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public interface SupportChatMessageRepository extends JpaRepository<ChatMessage, Long> {
    
    Page<ChatMessage> findByChatRoomIdOrderByCreatedAtAsc(Long chatRoomId, Pageable pageable);
    
    @Query("SELECT COUNT(cm) FROM SupportChatMessage cm WHERE cm.chatRoom.id = :chatRoomId AND cm.isRead = false AND cm.senderType = 'CUSTOMER'")
    Long countUnreadCustomerMessages(@Param("chatRoomId") Long chatRoomId);
    
    @Query("SELECT COUNT(cm) FROM SupportChatMessage cm WHERE cm.chatRoom.id = :chatRoomId AND cm.isRead = false AND cm.senderType = 'ADMIN'")
    Long countUnreadAdminMessages(@Param("chatRoomId") Long chatRoomId);
    
    // CRITICAL FIX: Use SenderType ENUM instead of String to ensure proper comparison
    @Modifying
    @Transactional
    @Query("UPDATE SupportChatMessage cm SET cm.isRead = true, cm.readAt = CURRENT_TIMESTAMP WHERE cm.chatRoom.id = :chatRoomId AND cm.senderType = :senderType AND cm.isRead = false")
    int markMessagesAsRead(@Param("chatRoomId") Long chatRoomId, @Param("senderType") com.webbanhang.shop.Model.Chats.SenderType senderType);
    
    @Modifying
    @Transactional
    @Query("DELETE FROM SupportChatMessage cm WHERE cm.chatRoom.id = :chatRoomId")
    void deleteAllByChatRoomId(@Param("chatRoomId") Long chatRoomId);
    
    // Get last message for a chat room (for preview)
    @Query("SELECT cm FROM SupportChatMessage cm WHERE cm.chatRoom.id = :chatRoomId ORDER BY cm.createdAt DESC")
    Page<ChatMessage> findLastMessageByChatRoomId(@Param("chatRoomId") Long chatRoomId, Pageable pageable);
}
