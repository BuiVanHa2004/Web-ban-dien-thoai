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

import java.time.LocalDateTime;

@Repository
public interface SupportChatMessageRepository extends JpaRepository<ChatMessage, Long> {
    
    Page<ChatMessage> findByChatRoomIdOrderByCreatedAtAsc(Long chatRoomId, Pageable pageable);
    
    // BUG 2 FIX: Load messages after customer deleted timestamp
    @Query("SELECT cm FROM SupportChatMessage cm WHERE cm.chatRoom.id = :chatRoomId AND cm.createdAt > :deletedAt ORDER BY cm.createdAt ASC")
    Page<ChatMessage> findByChatRoomIdAfterTimestamp(@Param("chatRoomId") Long chatRoomId, @Param("deletedAt") LocalDateTime deletedAt, Pageable pageable);
    
    // NEW: Get messages for ADMIN (exclude deleted_for_admin)
    @Query("SELECT cm FROM SupportChatMessage cm WHERE cm.chatRoom.id = :chatRoomId AND cm.deletedForAdmin = false ORDER BY cm.createdAt ASC")
    Page<ChatMessage> findByChatRoomIdForAdmin(@Param("chatRoomId") Long chatRoomId, Pageable pageable);
    
    // NEW: Get messages for CUSTOMER (exclude deleted_for_customer)
    @Query("SELECT cm FROM SupportChatMessage cm WHERE cm.chatRoom.id = :chatRoomId AND cm.deletedForCustomer = false ORDER BY cm.createdAt ASC")
    Page<ChatMessage> findByChatRoomIdForCustomer(@Param("chatRoomId") Long chatRoomId, Pageable pageable);
    
    // NEW: Get messages for ADMIN after timestamp AND not deleted
    @Query("SELECT cm FROM SupportChatMessage cm WHERE cm.chatRoom.id = :chatRoomId AND cm.createdAt > :deletedAt AND cm.deletedForAdmin = false ORDER BY cm.createdAt ASC")
    Page<ChatMessage> findByChatRoomIdAfterTimestampForAdmin(@Param("chatRoomId") Long chatRoomId, @Param("deletedAt") LocalDateTime deletedAt, Pageable pageable);
    
    // NEW: Get messages for CUSTOMER after timestamp AND not deleted
    @Query("SELECT cm FROM SupportChatMessage cm WHERE cm.chatRoom.id = :chatRoomId AND cm.createdAt > :deletedAt AND cm.deletedForCustomer = false ORDER BY cm.createdAt ASC")
    Page<ChatMessage> findByChatRoomIdAfterTimestampForCustomer(@Param("chatRoomId") Long chatRoomId, @Param("deletedAt") LocalDateTime deletedAt, Pageable pageable);
    
    @Query("SELECT COUNT(cm) FROM SupportChatMessage cm WHERE cm.chatRoom.id = :chatRoomId AND cm.isRead = false AND cm.senderType = 'CUSTOMER'")
    Long countUnreadCustomerMessages(@Param("chatRoomId") Long chatRoomId);
    
    @Query("SELECT COUNT(cm) FROM SupportChatMessage cm WHERE cm.chatRoom.id = :chatRoomId AND cm.isRead = false AND cm.senderType = 'ADMIN'")
    Long countUnreadAdminMessages(@Param("chatRoomId") Long chatRoomId);
    
    @Modifying
    @Transactional
    @Query("UPDATE SupportChatMessage cm SET cm.isRead = true, cm.readAt = CURRENT_TIMESTAMP WHERE cm.chatRoom.id = :chatRoomId AND cm.senderType = :senderType AND cm.isRead = false")
    int markMessagesAsRead(@Param("chatRoomId") Long chatRoomId, @Param("senderType") com.webbanhang.shop.Model.Chats.SenderType senderType);
    
    @Modifying
    @Transactional
    @Query("DELETE FROM SupportChatMessage cm WHERE cm.chatRoom.id = :chatRoomId")
    void deleteAllByChatRoomId(@Param("chatRoomId") Long chatRoomId);
    
    @Query("SELECT cm FROM SupportChatMessage cm WHERE cm.chatRoom.id = :chatRoomId ORDER BY cm.createdAt DESC")
    Page<ChatMessage> findLastMessageByChatRoomId(@Param("chatRoomId") Long chatRoomId, Pageable pageable);
}
