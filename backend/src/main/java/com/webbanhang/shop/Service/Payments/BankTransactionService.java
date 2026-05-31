package com.webbanhang.shop.Service.Payments;

import com.webbanhang.shop.DTO.Payments.AdminCreateBankTransactionRequest;
import com.webbanhang.shop.DTO.Payments.MatchResultDto;
import com.webbanhang.shop.Model.Orders.BankTransaction;

import java.util.List;

public interface BankTransactionService {
    BankTransaction createTransactionFromAdminInput(AdminCreateBankTransactionRequest request);

    List<BankTransaction> importTransactionsFromFile(String csvLikePayload);

    List<MatchResultDto> matchTransactionsWithOrders();

    List<MatchResultDto> autoMatchByContent();

    BankTransaction confirmMatch(Integer transactionId, Integer orderId, Integer adminId, String note);

    BankTransaction rejectMatch(Integer transactionId);
    BankTransaction rejectMatch(Integer transactionId, Integer orderId, Integer adminId, String note);

    List<BankTransaction> getAll(Boolean matched, Boolean trash);
    void delete(Integer transactionId);
    void restore(Integer transactionId);
    void hardDelete(Integer transactionId);

    List<com.webbanhang.shop.DTO.Payments.SelectableOrderDto> getSelectableOrders();

    BankTransaction reMatchTransaction(Integer transactionId, Integer adminId, String note);
}
