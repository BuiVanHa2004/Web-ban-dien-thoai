package com.webbanhang.shop.DTO.Chats;

import com.webbanhang.shop.Model.Chats.ChatRoomStatus;
import com.webbanhang.shop.Model.Chats.SenderType;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChatRoomDTO {
    private Long id;
    private Long customerId;
    private String customerName;
    private String customerAvatar;
    private String customerEmail;
    private Long adminId;
    private String adminName;
    private String adminAvatar;
    private ChatRoomStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime lastMessageAt;
    private String lastMessage;
    private SenderType lastMessageSenderType;
    private Long unreadCount;
}
