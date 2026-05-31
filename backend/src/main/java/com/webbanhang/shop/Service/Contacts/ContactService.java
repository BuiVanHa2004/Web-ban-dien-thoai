package com.webbanhang.shop.Service.Contacts;

import com.webbanhang.shop.DTO.Contacts.ContactCreateResponse;
import com.webbanhang.shop.DTO.Contacts.ContactDto;
import com.webbanhang.shop.DTO.Contacts.ContactReplyCreateResponse;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface ContactService {

    ContactCreateResponse createContact(
            Integer customerId,
            String fullName,
            String email,
            String phone,
            String subject,
            String message,
            List<MultipartFile> images
    );

    ContactCreateResponse updateContact(
            Integer contactId,
            String fullName,
            String email,
            String phone,
            String subject,
            String message,
            List<MultipartFile> images,
            List<String> existingImageUrls
    );

    void deleteContact(Integer contactId);

    ContactReplyCreateResponse createReply(
            Integer contactId,
            Integer adminId,
            String replyContent,
            List<MultipartFile> images
    );

    List<ContactDto> getContactsByEmail(String email, Integer customerId);

    List<ContactDto> getAllContacts();

    ContactDto getContactDetail(Integer contactId);

    List<ContactDto> getTrashedContacts();

    void softDeleteContact(Integer contactId);

    void restoreContact(Integer contactId);

    void deleteContactForever(Integer contactId);

    List<ContactReplyCreateResponse> getRepliesByContactId(Integer contactId);
 
    void deleteReply(Integer replyId);

    ContactReplyCreateResponse updateReply(
            Integer replyId,
            String replyContent,
            List<MultipartFile> images,
            List<String> existingImageUrls
    );
}
