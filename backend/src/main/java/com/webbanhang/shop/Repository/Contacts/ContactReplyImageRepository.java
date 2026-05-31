package com.webbanhang.shop.Repository.Contacts;

import com.webbanhang.shop.Model.Contacts.ContactReplyImage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ContactReplyImageRepository extends JpaRepository<ContactReplyImage, Integer> {
    List<ContactReplyImage> findAllByReplyReplyIdOrderBySortOrderAsc(Integer replyId);
}
