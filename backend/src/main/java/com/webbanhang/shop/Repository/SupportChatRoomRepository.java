package com.webbanhang.shop.Repository;

import com.webbanhang.shop.Model.Chats.ChatRoom;
import com.webbanhang.shop.Model.Chats.ChatRoomStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SupportChatRoomRepository extends JpaRepository<ChatRoom, Long> {
    
    // Get or create active chat room for customer (exclude deleted rooms)
    @Query("SELECT cr FROM SupportChatRoom cr WHERE cr.customer.customerId = :customerId AND cr.status = :status AND cr.customerDeletedAt IS NULL ORDER BY cr.lastMessageAt DESC")
    Optional<ChatRoom> findByCustomerIdAndStatus(@Param("customerId") Long customerId, @Param("status") ChatRoomStatus status);
    
    // Customer view: Exclude rooms deleted by customer, include all others
    @Query("SELECT cr FROM SupportChatRoom cr WHERE cr.customer.customerId = :customerId AND cr.customerDeletedAt IS NULL ORDER BY cr.lastMessageAt DESC")
    Page<ChatRoom> findByCustomerId(@Param("customerId") Long customerId, Pageable pageable);
    
    // Admin view: Exclude rooms deleted by admin, include all others
    @Query("SELECT cr FROM SupportChatRoom cr WHERE cr.status = :status AND cr.adminDeletedAt IS NULL ORDER BY cr.lastMessageAt DESC")
    Page<ChatRoom> findByStatus(@Param("status") ChatRoomStatus status, Pageable pageable);
    
    @Query("SELECT cr FROM SupportChatRoom cr WHERE cr.admin.accountId = :adminId AND cr.status = :status AND cr.adminDeletedAt IS NULL ORDER BY cr.lastMessageAt DESC")
    Page<ChatRoom> findByAdminIdAndStatus(@Param("adminId") Long adminId, @Param("status") ChatRoomStatus status, Pageable pageable);
    
    @Query("SELECT COUNT(cr) FROM SupportChatRoom cr WHERE cr.status = 'ACTIVE' AND cr.admin.accountId IS NULL AND cr.adminDeletedAt IS NULL")
    Long countUnassignedActiveRooms();
}
