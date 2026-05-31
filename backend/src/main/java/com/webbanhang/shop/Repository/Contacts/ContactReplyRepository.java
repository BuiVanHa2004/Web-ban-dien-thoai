package com.webbanhang.shop.Repository.Contacts;

import com.webbanhang.shop.Model.Contacts.ContactReply;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ContactReplyRepository extends JpaRepository<ContactReply, Integer> {
    List<ContactReply> findAllByContactContactIdOrderByCreatedAtAsc(Integer contactId);
}
