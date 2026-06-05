package com.webbanhang.shop.Service.Contacts.Impl;

import com.webbanhang.shop.DTO.Contacts.ContactCreateResponse;
import com.webbanhang.shop.DTO.Contacts.ContactDto;
import com.webbanhang.shop.DTO.Contacts.ContactReplyCreateResponse;
import com.webbanhang.shop.Model.Admins.AdminAccount;
import com.webbanhang.shop.Model.Contacts.Contact;
import com.webbanhang.shop.Model.Contacts.ContactImage;
import com.webbanhang.shop.Model.Contacts.ContactReply;
import com.webbanhang.shop.Model.Contacts.ContactReplyImage;
import com.webbanhang.shop.Model.Customers.CustomerAccount;
import com.webbanhang.shop.Repository.Admins.AdminAccountRepository;
import com.webbanhang.shop.Repository.Contacts.ContactReplyRepository;
import com.webbanhang.shop.Repository.Contacts.ContactRepository;
import com.webbanhang.shop.Repository.Customers.CustomerAccountRepository;
import com.webbanhang.shop.Service.Contacts.ContactService;
import com.webbanhang.shop.Service.Storage.MinioStorageService;
import com.webbanhang.shop.Service.Notifications.NotificationService;
import com.webbanhang.shop.Service.Notifications.CustomerNotificationService;
import com.webbanhang.shop.DTO.Notifications.NotificationDto;
import com.webbanhang.shop.Model.Notifications.NotificationType;
import com.webbanhang.shop.Model.Notifications.NotificationAction;
import com.webbanhang.shop.Model.Notifications.ActorType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

@Service
@SuppressWarnings("null")
public class ContactServiceImpl implements ContactService {

    private final ContactRepository contactRepository;
    private final ContactReplyRepository contactReplyRepository;
    private final AdminAccountRepository adminAccountRepository;
    private final CustomerAccountRepository customerAccountRepository;
    private final MinioStorageService minioStorageService;
    private final NotificationService notificationService;
    private final CustomerNotificationService customerNotificationService;

    public ContactServiceImpl(
            ContactRepository contactRepository,
            ContactReplyRepository contactReplyRepository,
            AdminAccountRepository adminAccountRepository,
            CustomerAccountRepository customerAccountRepository,
            MinioStorageService minioStorageService,
            NotificationService notificationService,
            CustomerNotificationService customerNotificationService
    ) {
        this.contactRepository = contactRepository;
        this.contactReplyRepository = contactReplyRepository;
        this.adminAccountRepository = adminAccountRepository;
        this.customerAccountRepository = customerAccountRepository;
        this.minioStorageService = minioStorageService;
        this.notificationService = notificationService;
        this.customerNotificationService = customerNotificationService;
    }

    @Override
    @Transactional
    public ContactCreateResponse createContact(
            Integer customerId,
            String fullName,
            String email,
            String phone,
            String subject,
            String message,
            List<MultipartFile> images
    ) {
        Contact c = new Contact();
        if (customerId != null) {
            customerAccountRepository.findById(customerId).ifPresent(c::setCustomer);
        }
        c.setFullName(fullName);
        c.setEmail(email);
        c.setPhone(phone);
        c.setSubject(subject);
        c.setMessage(message);

        if (images != null) {
            for (MultipartFile f : images) {
                if (f == null || f.isEmpty()) continue;
                MinioStorageService.UploadedObject uploaded = minioStorageService.uploadContactImage(f);

                ContactImage img = new ContactImage();
                img.setContact(c);
                img.setImageUrl(uploaded.url());
                c.getImages().add(img);
            }
        }

        Contact saved = contactRepository.save(c);

        // create notification
        NotificationDto notif = NotificationDto.builder()
                .type(NotificationType.CONTACT)
                .action(NotificationAction.CREATE)
                .actorType(customerId != null ? ActorType.CUSTOMER : ActorType.SYSTEM)
                .actorId(customerId)
                .actorName(fullName)
                .contactId(saved.getContactId())
                .title("Liên hệ mới")
                .message("Bạn có liên hệ mới từ " + fullName)
                .build();
        notificationService.notifyAllAdmins(notif);

        List<String> imageUrls = saved.getImages().stream().map(ContactImage::getImageUrl).toList();
        return new ContactCreateResponse(
                saved.getContactId(),
                saved.getFullName(),
                saved.getEmail(),
                saved.getPhone(),
                saved.getSubject(),
                saved.getMessage(),
                saved.getCreatedAt(),
                imageUrls
        );
    }

    @Override
    @Transactional
    public ContactReplyCreateResponse createReply(
            Integer contactId,
            Integer adminId,
            String replyContent,
            List<MultipartFile> images
    ) {
        Contact contact = contactRepository.findById(contactId)
                .orElseThrow(() -> new IllegalArgumentException("Contact not found"));

        AdminAccount admin = null;
        if (adminId != null) {
            admin = adminAccountRepository.findByAccountId(adminId).orElse(null);
        }

        ContactReply reply = new ContactReply();
        reply.setContact(contact);
        reply.setAdmin(admin);
        reply.setReplyContent(Objects.requireNonNullElse(replyContent, "").trim());
        if (reply.getReplyContent().isBlank()) {
            throw new IllegalArgumentException("Reply content is required");
        }

        if (images != null) {
            int order = 0;
            for (MultipartFile f : images) {
                if (f == null || f.isEmpty()) continue;
                MinioStorageService.UploadedObject uploaded = minioStorageService.uploadContactReplyImage(f);

                ContactReplyImage img = new ContactReplyImage();
                img.setReply(reply);
                img.setImageUrl(uploaded.url());
                img.setSortOrder(order++);
                reply.getImages().add(img);
            }
        }

        ContactReply savedReply = contactReplyRepository.save(reply);

        // Notify customer
        if (contact.getCustomer() != null) {
            NotificationDto notif = NotificationDto.builder()
                    .adminId(contact.getCustomer().getCustomerId()) // customer ID
                    .type(NotificationType.CONTACT)
                    .action(NotificationAction.REPLY)
                    .actorType(ActorType.ADMIN)
                    .contactId(contact.getContactId())
                    .title("Phản hồi liên hệ")
                    .message("Shop đã phản hồi liên hệ của bạn về: " + contact.getSubject())
                    .build();
            customerNotificationService.createNotification(notif);
        }

        List<String> imageUrls = new ArrayList<>();
        if (savedReply.getImages() != null) {
            for (ContactReplyImage img : savedReply.getImages()) {
                imageUrls.add(img.getImageUrl());
            }
        }

        return new ContactReplyCreateResponse(
                savedReply.getReplyId(),
                savedReply.getContact().getContactId(),
                savedReply.getAdmin() != null ? savedReply.getAdmin().getAccountId() : null,
                savedReply.getReplyContent(),
                savedReply.getIsRead(),
                savedReply.getCreatedAt(),
                savedReply.getUpdatedAt(),
                imageUrls
        );
    }

    @Override
    @Transactional
    public ContactCreateResponse updateContact(
            Integer contactId,
            String fullName,
            String email,
            String phone,
            String subject,
            String message,
            List<MultipartFile> images,
            List<String> existingImageUrls
    ) {
        if (contactId == null) {
            throw new IllegalArgumentException("contactId is required");
        }
        Contact c = contactRepository.findById(contactId)
                .orElseThrow(() -> new IllegalArgumentException("Contact not found"));

        c.setFullName(fullName);
        c.setEmail(email);
        c.setPhone(phone);
        c.setSubject(subject);
        c.setMessage(message);

        // 1. Handle existing images (removal)
        List<String> safeExisting = existingImageUrls == null ? List.of() : existingImageUrls;
        List<ContactImage> toRemove = new ArrayList<>();
        if (c.getImages() != null) {
            for (ContactImage img : c.getImages()) {
                if (!safeExisting.contains(img.getImageUrl())) {
                    toRemove.add(img);
                }
            }
        }

        for (ContactImage img : toRemove) {
            minioStorageService.deleteByUrl(img.getImageUrl());
            c.getImages().remove(img);
        }

        // 2. Handle new images
        if (images != null && !images.isEmpty()) {
            for (MultipartFile f : images) {
                if (f != null && !f.isEmpty()) {
                    MinioStorageService.UploadedObject uploaded = minioStorageService.uploadContactImage(f);
                    ContactImage ci = new ContactImage();
                    ci.setContact(c);
                    ci.setImageUrl(uploaded.url());
                    c.getImages().add(ci);
                }
            }
        }

        Contact saved = contactRepository.save(c);
        return new ContactCreateResponse(
                saved.getContactId(),
                saved.getFullName(),
                saved.getEmail(),
                saved.getPhone(),
                saved.getSubject(),
                saved.getMessage(),
                saved.getCreatedAt(),
                saved.getImages().stream().map(ContactImage::getImageUrl).toList()
        );
    }

    @Override
    @Transactional
    public void deleteContact(Integer contactId) {
        deleteContactForever(contactId);
    }

    private ContactDto mapToDto(Contact c) {
        CustomerAccount cust = c.getCustomer();
        return new ContactDto(
                c.getContactId(),
                c.getFullName(),
                c.getEmail(),
                c.getPhone(),
                c.getSubject(),
                c.getMessage(),
                c.getCreatedAt(),
                c.getDeletedAt(),
                c.getImages() == null
                        ? List.of()
                        : c.getImages().stream().map(ContactImage::getImageUrl).toList(),
                cust != null ? cust.getCustomerId() : null,
                cust != null ? cust.getFullName() : null,
                cust != null ? cust.getEmail() : null,
                cust != null ? cust.getPhone() : null
        );
    }

    @Override
    @Transactional(readOnly = true)
    public List<ContactDto> getContactsByEmail(String email, Integer customerId) {
        String key = Objects.requireNonNullElse(email, "").trim();
        List<Contact> contacts;
        if (customerId != null) {
            contacts = contactRepository.findAllByCustomerCustomerIdOrEmailOrderByCreatedAtDesc(customerId, key);
        } else {
            if (key.isBlank()) {
                throw new IllegalArgumentException("Email is required");
            }
            contacts = contactRepository.findAllByEmailOrderByCreatedAtDesc(key);
        }

        return contacts.stream()
                .map(this::mapToDto)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<ContactDto> getAllContacts() {
        return contactRepository.findAllByDeletedAtIsNullOrderByCreatedAtDesc()
                .stream()
                .map(this::mapToDto)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public ContactDto getContactDetail(Integer contactId) {
        if (contactId == null) {
            throw new IllegalArgumentException("contactId is required");
        }
        Contact c = contactRepository.findById(contactId)
                .orElseThrow(() -> new IllegalArgumentException("Contact not found"));

        return mapToDto(c);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ContactDto> getTrashedContacts() {
        return contactRepository.findAllByDeletedAtIsNotNullOrderByDeletedAtDesc()
                .stream()
                .map(this::mapToDto)
                .toList();
    }

    @Override
    @Transactional
    public void softDeleteContact(Integer contactId) {
        if (contactId == null) {
            throw new IllegalArgumentException("contactId is required");
        }
        Contact c = contactRepository.findById(contactId)
                .orElseThrow(() -> new IllegalArgumentException("Contact not found"));
        if (c.getDeletedAt() != null) return;
        c.setDeletedAt(java.time.Instant.now());
        contactRepository.save(c);
    }

    @Override
    @Transactional
    public void restoreContact(Integer contactId) {
        if (contactId == null) {
            throw new IllegalArgumentException("contactId is required");
        }
        Contact c = contactRepository.findById(contactId)
                .orElseThrow(() -> new IllegalArgumentException("Contact not found"));
        c.setDeletedAt(null);
        contactRepository.save(c);
    }

    @Override
    @Transactional
    public void deleteContactForever(Integer contactId) {
        if (contactId == null) {
            throw new IllegalArgumentException("contactId is required");
        }
        Contact c = contactRepository.findById(contactId)
                .orElseThrow(() -> new IllegalArgumentException("Contact not found"));

        // 1. Delete customer images from MinIO
        if (c.getImages() != null) {
            for (ContactImage img : c.getImages()) {
                minioStorageService.deleteByUrl(img.getImageUrl());
            }
        }

        // 2. Delete shop reply images from MinIO
        if (c.getReplies() != null) {
            for (ContactReply reply : c.getReplies()) {
                if (reply.getImages() != null) {
                    for (ContactReplyImage img : reply.getImages()) {
                        minioStorageService.deleteByUrl(img.getImageUrl());
                    }
                }
            }
        }

        contactRepository.delete(c);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ContactReplyCreateResponse> getRepliesByContactId(Integer contactId) {
        if (contactId == null) {
            throw new IllegalArgumentException("contactId is required");
        }
        return contactReplyRepository.findAllByContactContactIdOrderByCreatedAtAsc(contactId)
                .stream()
                .map(r -> new ContactReplyCreateResponse(
                        r.getReplyId(),
                        r.getContact() != null ? r.getContact().getContactId() : null,
                        r.getAdmin() != null ? r.getAdmin().getAccountId() : null,
                        r.getReplyContent(),
                        r.getIsRead(),
                        r.getCreatedAt(),
                        r.getUpdatedAt(),
                        r.getImages() == null
                                ? List.of()
                                : r.getImages().stream().map(ContactReplyImage::getImageUrl).toList()
                ))
                .toList();
    }
 
    @Override
    @Transactional
    public void deleteReply(Integer replyId) {
        if (replyId == null) {
            throw new IllegalArgumentException("replyId is required");
        }
        ContactReply reply = contactReplyRepository.findById(replyId)
                .orElseThrow(() -> new IllegalArgumentException("Reply not found"));
 
        // Delete images from MinIO
        if (reply.getImages() != null) {
            for (ContactReplyImage img : reply.getImages()) {
                minioStorageService.deleteByUrl(img.getImageUrl());
            }
        }
 
        contactReplyRepository.delete(reply);
    }

    @Override
    @Transactional
    public ContactReplyCreateResponse updateReply(
            Integer replyId,
            String replyContent,
            List<MultipartFile> images,
            List<String> existingImageUrls
    ) {
        ContactReply reply = contactReplyRepository.findById(replyId)
                .orElseThrow(() -> new IllegalArgumentException("Reply not found"));

        reply.setReplyContent(Objects.requireNonNullElse(replyContent, "").trim());
        if (reply.getReplyContent().isBlank()) {
            throw new IllegalArgumentException("Reply content is required");
        }

        // 1. Remove images not in existingImageUrls
        List<ContactReplyImage> currentImages = new ArrayList<>(reply.getImages());
        List<String> keepUrls = existingImageUrls != null ? existingImageUrls : new ArrayList<>();

        for (ContactReplyImage img : currentImages) {
            if (!keepUrls.contains(img.getImageUrl())) {
                minioStorageService.deleteByUrl(img.getImageUrl());
                reply.getImages().remove(img);
            }
        }

        // 2. Add new images
        if (images != null) {
            int maxOrder = reply.getImages().stream()
                    .mapToInt(ContactReplyImage::getSortOrder)
                    .max()
                    .orElse(-1);

            for (MultipartFile f : images) {
                if (f == null || f.isEmpty()) continue;
                MinioStorageService.UploadedObject uploaded = minioStorageService.uploadContactReplyImage(f);

                ContactReplyImage img = new ContactReplyImage();
                img.setReply(reply);
                img.setImageUrl(uploaded.url());
                img.setSortOrder(++maxOrder);
                reply.getImages().add(img);
            }
        }

        ContactReply saved = contactReplyRepository.save(reply);

        List<String> resultUrls = saved.getImages().stream()
                .map(ContactReplyImage::getImageUrl)
                .toList();

        return new ContactReplyCreateResponse(
                saved.getReplyId(),
                saved.getContact().getContactId(),
                saved.getAdmin() != null ? saved.getAdmin().getAccountId() : null,
                saved.getReplyContent(),
                saved.getIsRead(),
                saved.getCreatedAt(),
                saved.getUpdatedAt(),
                resultUrls
        );
    }
}
