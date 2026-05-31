package com.webbanhang.shop.Repository.Contacts;

import com.webbanhang.shop.Model.Contacts.ContactImage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ContactImageRepository extends JpaRepository<ContactImage, Integer> {
    List<ContactImage> findAllByContactContactId(Integer contactId);
}
