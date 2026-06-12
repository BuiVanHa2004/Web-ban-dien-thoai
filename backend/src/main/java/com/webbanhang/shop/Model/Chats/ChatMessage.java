package com.webbanhang.shop.Model.Chats;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity(name = "SupportChatMessage")
@Table(name = "chat_messages")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessage {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "chat_room_id", nullable = false)
    private ChatRoom chatRoom;

    @Column(name = "sender_type", nullable = false)
    @Enumerated(EnumType.STRING)
    private SenderType senderType;

    @Column(name = "sender_id", nullable = false, columnDefinition = "INT UNSIGNED")
    private Long senderId;

    @Column(name = "message", columnDefinition = "TEXT")
    private String message;

    @Column(name = "edited")
    private Boolean edited = false;

    @Column(name = "edited_at")
    private LocalDateTime editedAt;

    @Column(name = "recalled")
    private Boolean recalled = false;

    @Column(name = "recalled_at")
    private LocalDateTime recalledAt;

    @Column(name = "deleted_for_admin")
    private Boolean deletedForAdmin = false;

    @Column(name = "deleted_for_customer")
    private Boolean deletedForCustomer = false;

    @Column(name = "message_type", nullable = false)
    @Enumerated(EnumType.STRING)
    private MessageType messageType = MessageType.TEXT;

    @Column(name = "attachment_url", length = 1024)
    private String attachmentUrl;

    @Column(name = "is_read")
    private Boolean isRead = false;

    @Column(name = "read_at")
    private LocalDateTime readAt;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (messageType == null) {
            messageType = MessageType.TEXT;
        }
    }
}
