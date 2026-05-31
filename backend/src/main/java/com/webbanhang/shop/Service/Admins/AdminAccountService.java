package com.webbanhang.shop.Service.Admins;

import com.webbanhang.shop.DTO.Admins.AdminAccountUpsertRequest;
import com.webbanhang.shop.Model.Admins.AdminAccount;

import java.util.List;
import java.util.Optional;

public interface AdminAccountService {

    List<AdminAccount> findAllActive();

    List<AdminAccount> findAllTrashed();

    Optional<AdminAccount> findById(Integer id);

    AdminAccount create(AdminAccountUpsertRequest req);

    Optional<AdminAccount> update(Integer id, AdminAccountUpsertRequest req);

    Optional<AdminAccount> changePassword(Integer id, String oldPassword, String newPassword);

    boolean softDelete(Integer id);

    boolean restore(Integer id);

    boolean deleteForever(Integer id);
}
