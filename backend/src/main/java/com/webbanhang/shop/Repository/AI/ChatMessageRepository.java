package com.webbanhang.shop.Repository.AI;

import com.webbanhang.shop.Model.AI.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {
    List<ChatMessage> findTop20BySessionIdOrderByCreatedAtDesc(Long sessionId);
    
    /**
     * Đếm số lượng tin nhắn theo sessionId và role (user/assistant)
     */
    long countBySessionIdAndRole(Long sessionId, String role);
}
