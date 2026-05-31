package com.webbanhang.shop.Repository.Contacts;

import com.webbanhang.shop.Model.Contacts.Contact;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ContactRepository extends JpaRepository<Contact, Integer> {

    List<Contact> findAllByEmailOrderByCreatedAtDesc(String email);

    List<Contact> findAllByCustomerCustomerIdOrEmailOrderByCreatedAtDesc(Integer customerId, String email);

    List<Contact> findAllByOrderByCreatedAtDesc();

    List<Contact> findAllByDeletedAtIsNullOrderByCreatedAtDesc();

    List<Contact> findAllByDeletedAtIsNotNullOrderByDeletedAtDesc();
}
