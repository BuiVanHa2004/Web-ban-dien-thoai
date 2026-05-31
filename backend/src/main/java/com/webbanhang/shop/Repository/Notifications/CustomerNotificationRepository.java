package com.webbanhang.shop.Repository.Notifications;

import com.webbanhang.shop.Model.Notifications.CustomerNotification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;

@Repository
public interface CustomerNotificationRepository extends JpaRepository<CustomerNotification, Integer> {

    @Query("SELECT n FROM CustomerNotification n WHERE n.customer.customerId = :customerId AND n.deletedAt IS NULL ORDER BY n.createdAt DESC")
    Page<CustomerNotification> findByCustomerCustomerIdOrderByCreatedAtDesc(@Param("customerId") Integer customerId, Pageable pageable);

    @Query("SELECT COUNT(n) FROM CustomerNotification n WHERE n.customer.customerId = :customerId AND n.isRead = false AND n.deletedAt IS NULL")
    long countUnreadByCustomer(@Param("customerId") Integer customerId);

    @Modifying
    @Query("UPDATE CustomerNotification n SET n.isRead = true, n.readAt = :readAt WHERE n.customer.customerId = :customerId AND n.isRead = false AND n.deletedAt IS NULL")
    void markAllAsRead(@Param("customerId") Integer customerId, @Param("readAt") Instant readAt);
}
