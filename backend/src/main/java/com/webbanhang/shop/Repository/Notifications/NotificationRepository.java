package com.webbanhang.shop.Repository.Notifications;

import com.webbanhang.shop.Model.Notifications.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Integer> {

    @Query("SELECT n FROM Notification n WHERE n.admin.accountId = :adminId AND n.deletedAt IS NULL ORDER BY n.createdAt DESC")
    Page<Notification> findByAdminId(@Param("adminId") Integer adminId, Pageable pageable);

    @Query("SELECT COUNT(n) FROM Notification n WHERE n.admin.accountId = :adminId AND n.isRead = false AND n.deletedAt IS NULL")
    long countUnreadByAdminId(@Param("adminId") Integer adminId);

    @Modifying
    @Query("UPDATE Notification n SET n.isRead = true, n.readAt = CURRENT_TIMESTAMP WHERE n.admin.accountId = :adminId AND n.isRead = false")
    void markAllAsReadByAdminId(@Param("adminId") Integer adminId);
}
