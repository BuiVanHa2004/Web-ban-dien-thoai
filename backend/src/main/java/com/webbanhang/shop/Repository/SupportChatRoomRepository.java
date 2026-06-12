package com.webbanhang.shop.Repository;

import com.webbanhang.shop.Model.Chats.ChatRoom;
import com.webbanhang.shop.Model.Chats.ChatRoomStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface SupportChatRoomRepository extends JpaRepository<ChatRoom, Long> {
    
    // Get or create active chat room for customer (exclude deleted rooms)
    // Use Pageable to LIMIT 1 and prevent duplicates
    @Query("SELECT cr FROM SupportChatRoom cr WHERE cr.customer.customerId = :customerId AND cr.status = :status ORDER BY cr.lastMessageAt DESC")
    Page<ChatRoom> findByCustomerIdAndStatusPaged(@Param("customerId") Long customerId, @Param("status") ChatRoomStatus status, Pageable pageable);
    
    // Get ALL rooms for customer (to check for existing room)
    @Query("SELECT cr FROM SupportChatRoom cr WHERE cr.customer.customerId = :customerId ORDER BY cr.lastMessageAt DESC")
    Page<ChatRoom> findByCustomerId(@Param("customerId") Long customerId, Pageable pageable);
    
    // Admin view: Show rooms with NEW messages OR not deleted by admin
    @Query("SELECT cr FROM SupportChatRoom cr WHERE cr.status = :status " +
           "AND (cr.adminDeletedAt IS NULL " +
           "     OR EXISTS (SELECT 1 FROM SupportChatMessage m WHERE m.chatRoom.id = cr.id AND m.createdAt > cr.adminDeletedAt)) " +
           "ORDER BY cr.lastMessageAt DESC")
    Page<ChatRoom> findByStatus(@Param("status") ChatRoomStatus status, Pageable pageable);
    
    @Query("SELECT cr FROM SupportChatRoom cr WHERE cr.admin.accountId = :adminId AND cr.status = :status AND cr.adminDeletedAt IS NULL ORDER BY cr.lastMessageAt DESC")
    Page<ChatRoom> findByAdminIdAndStatus(@Param("adminId") Long adminId, @Param("status") ChatRoomStatus status, Pageable pageable);
    
    @Query("SELECT COUNT(cr) FROM SupportChatRoom cr WHERE cr.status = 'ACTIVE' AND cr.admin.accountId IS NULL AND cr.adminDeletedAt IS NULL")
    Long countUnassignedActiveRooms();
}
