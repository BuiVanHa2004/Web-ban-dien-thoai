package com.webbanhang.shop.Repository.Admins;

import com.webbanhang.shop.Model.Admins.AdminAccount;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AdminAccountRepository extends JpaRepository<AdminAccount, Integer> {

    @EntityGraph(attributePaths = {"role"})
    List<AdminAccount> findAllByDeletedAtIsNull();

    @EntityGraph(attributePaths = {"role"})
    List<AdminAccount> findAllByDeletedAtIsNotNullOrderByDeletedAtDesc();

    @EntityGraph(attributePaths = {"role"})
    Optional<AdminAccount> findByAccountId(Integer accountId);

    @EntityGraph(attributePaths = {"role"})
    Optional<AdminAccount> findByUsernameAndDeletedAtIsNull(String username);

    @EntityGraph(attributePaths = {"role"})
    Optional<AdminAccount> findByEmailAndDeletedAtIsNull(String email);

    @EntityGraph(attributePaths = {"role"})
    Optional<AdminAccount> findByPhoneAndDeletedAtIsNull(String phone);

    Optional<AdminAccount> findByUsername(String username);

    Optional<AdminAccount> findByEmail(String email);

    Optional<AdminAccount> findByPhone(String phone);
}
