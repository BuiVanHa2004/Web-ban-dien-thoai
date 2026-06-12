package com.webbanhang.shop.DTO.Chats;

import com.webbanhang.shop.Model.Chats.MessageType;
import com.webbanhang.shop.Model.Chats.SenderType;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessageDTO {
    private Long id;
    private Long chatRoomId;
    private SenderType senderType;
    private Long senderId;
    private String senderName;
    private String senderAvatar;
    private String message;
    private Boolean edited;
    private LocalDateTime editedAt;
    private Boolean recalled;
    private LocalDateTime recalledAt;
    private Boolean deletedForAdmin;
    private Boolean deletedForCustomer;
    private MessageType messageType;
    private String attachmentUrl;
    private Boolean isRead;
    private LocalDateTime createdAt;
}
