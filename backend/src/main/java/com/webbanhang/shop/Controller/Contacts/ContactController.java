package com.webbanhang.shop.Controller.Contacts;

import com.webbanhang.shop.DTO.Contacts.ContactCreateResponse;
import com.webbanhang.shop.DTO.Contacts.ContactDto;
import com.webbanhang.shop.DTO.Contacts.ContactReplyCreateResponse;
import com.webbanhang.shop.Service.Contacts.ContactService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class ContactController {

    private final ContactService contactService;

    public ContactController(ContactService contactService) {
        this.contactService = contactService;
    }

    @PostMapping(value = "/contacts", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> createContact(
            @RequestParam(value = "customer_id", required = false) Integer customerId,
            @RequestParam("full_name") String fullName,
            @RequestParam("email") String email,
            @RequestParam(value = "phone", required = false) String phone,
            @RequestParam("subject") String subject,
            @RequestParam("message") String message,
            @RequestParam(value = "images", required = false) List<MultipartFile> images
    ) {
        try {
            ContactCreateResponse res = contactService.createContact(customerId, fullName, email, phone, subject, message, images);
            return ResponseEntity.ok(res);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("message", "Có lỗi xảy ra."));
        }
    }
 
    @PatchMapping(value = "/contacts/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> updateContact(
            @PathVariable("id") Integer contactId,
            @RequestParam("full_name") String fullName,
            @RequestParam("email") String email,
            @RequestParam(value = "phone", required = false) String phone,
            @RequestParam("subject") String subject,
            @RequestParam("message") String message,
            @RequestParam(value = "images", required = false) List<MultipartFile> images,
            @RequestParam(value = "existingImageUrls", required = false) List<String> existingImageUrls
    ) {
        try {
            ContactCreateResponse res = contactService.updateContact(contactId, fullName, email, phone, subject, message, images, existingImageUrls);
            return ResponseEntity.ok(res);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("message", "Có lỗi xảy ra."));
        }
    }
 
    @DeleteMapping("/contacts/{id}")
    public ResponseEntity<?> deleteContact(@PathVariable("id") Integer id) {
        try {
            contactService.deleteContact(id);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("message", "Có lỗi xảy ra."));
        }
    }

    @GetMapping("/contacts")
    public ResponseEntity<?> getMyContacts(
            @RequestParam("email") String email,
            @RequestParam(value = "customer_id", required = false) Integer customerId
    ) {
        try {
            List<ContactDto> res = contactService.getContactsByEmail(email, customerId);
            return ResponseEntity.ok(res);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("message", "Có lỗi xảy ra."));
        }
    }

    @GetMapping("/admin/contacts")
    public ResponseEntity<?> getAllContacts() {
        try {
            List<ContactDto> res = contactService.getAllContacts();
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("message", "Có lỗi xảy ra."));
        }
    }

    @GetMapping("/admin/contacts/trash")
    public ResponseEntity<?> getTrashedContacts() {
        try {
            List<ContactDto> res = contactService.getTrashedContacts();
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("message", "Có lỗi xảy ra."));
        }
    }

    @GetMapping("/admin/contacts/{id}")
    public ResponseEntity<?> getContactDetail(@PathVariable("id") Integer id) {
        try {
            ContactDto res = contactService.getContactDetail(id);
            return ResponseEntity.ok(res);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("message", "Có lỗi xảy ra."));
        }
    }

    @DeleteMapping("/admin/contacts/{id}")
    public ResponseEntity<?> softDeleteContact(@PathVariable("id") Integer id) {
        try {
            contactService.softDeleteContact(id);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("message", "Có lỗi xảy ra."));
        }
    }

    @PatchMapping("/admin/contacts/{id}/restore")
    public ResponseEntity<?> restoreContact(@PathVariable("id") Integer id) {
        try {
            contactService.restoreContact(id);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("message", "Có lỗi xảy ra."));
        }
    }

    @DeleteMapping("/admin/contacts/{id}/force")
    public ResponseEntity<?> deleteForeverContact(@PathVariable("id") Integer id) {
        try {
            contactService.deleteContactForever(id);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("message", "Có lỗi xảy ra."));
        }
    }

    @PostMapping(value = "/contact-replies", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> createReply(
            @RequestParam("contact_id") Integer contactId,
            @RequestParam(value = "admin_id", required = false) Integer adminId,
            @RequestParam("reply_content") String replyContent,
            @RequestParam(value = "images", required = false) List<MultipartFile> images
    ) {
        try {
            ContactReplyCreateResponse res = contactService.createReply(contactId, adminId, replyContent, images);
            return ResponseEntity.ok(res);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("message", "Có lỗi xảy ra."));
        }
    }

    @GetMapping("/contact-replies")
    public ResponseEntity<?> getRepliesByContactId(@RequestParam("contact_id") Integer contactId) {
        try {
            List<ContactReplyCreateResponse> res = contactService.getRepliesByContactId(contactId);
            return ResponseEntity.ok(res);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("message", "Có lỗi xảy ra."));
        }
    }
 
    @DeleteMapping("/contact-replies/{id}")
    public ResponseEntity<?> deleteReply(@PathVariable("id") Integer id) {
        try {
            contactService.deleteReply(id);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("message", "Có lỗi xảy ra."));
        }
    }

    @PatchMapping(value = "/contact-replies/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> updateReply(
            @PathVariable("id") Integer replyId,
            @RequestParam("reply_content") String replyContent,
            @RequestParam(value = "images", required = false) List<MultipartFile> images,
            @RequestParam(value = "existingImageUrls", required = false) List<String> existingImageUrls
    ) {
        try {
            ContactReplyCreateResponse res = contactService.updateReply(replyId, replyContent, images, existingImageUrls);
            return ResponseEntity.ok(res);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("message", "Có lỗi xảy ra."));
        }
    }
}
