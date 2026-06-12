package com.webbanhang.shop.DTO.Chats;

import com.webbanhang.shop.Model.Chats.MessageType;
import com.webbanhang.shop.Model.Chats.SenderType;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SendMessageRequest {
    private Long chatRoomId;
    private SenderType senderType;
    private Long senderId;
    private String message;
    private MessageType messageType;
    private String attachmentUrl;
}
