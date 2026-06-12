package com.webbanhang.shop.DTO.Chats;

import com.webbanhang.shop.Model.Chats.SenderType;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DeleteMessageRequest {
    private Long messageId;
    private SenderType deleterType; // Who is deleting (ADMIN or CUSTOMER)
}
