package com.webbanhang.shop.Repository.AI;

import com.webbanhang.shop.Model.AI.ChatSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ChatSessionRepository extends JpaRepository<ChatSession, Long> {
    Optional<ChatSession> findByIdAndUserId(Long id, Integer userId);

    Optional<ChatSession> findByIdAndGuestSessionId(Long id, String guestSessionId);
}
