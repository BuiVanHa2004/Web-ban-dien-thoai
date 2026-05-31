package com.webbanhang.shop.Service.Customers;

import com.webbanhang.shop.DTO.Customers.ChangePasswordRequest;
import com.webbanhang.shop.DTO.Customers.CustomerAccountUpsertRequest;
import com.webbanhang.shop.Model.Customers.CustomerAccount;

import java.util.List;
import java.util.Optional;

public interface CustomerAccountService {

    List<CustomerAccount> findAllActive();
    
    List<CustomerAccount> findAllTrashed();

    Optional<CustomerAccount> findById(Integer id);

    CustomerAccount create(CustomerAccountUpsertRequest req);

    Optional<CustomerAccount> update(Integer id, CustomerAccountUpsertRequest req);

    void changePassword(Integer id, ChangePasswordRequest req);

    boolean softDelete(Integer id);

    boolean restore(Integer id);

    boolean deleteForever(Integer id);
}
