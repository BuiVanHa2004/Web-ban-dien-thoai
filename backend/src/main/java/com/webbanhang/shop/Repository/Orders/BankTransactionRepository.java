package com.webbanhang.shop.Repository.Orders;

import com.webbanhang.shop.Model.Orders.BankTransaction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BankTransactionRepository extends JpaRepository<BankTransaction, Integer> {
    List<BankTransaction> findAllByIsMatchedFalseAndDeletedAtIsNullOrderByCreatedAtDesc();
    List<BankTransaction> findAllByDeletedAtIsNullOrderByCreatedAtDesc();
    List<BankTransaction> findAllByDeletedAtIsNotNullOrderByCreatedAtDesc();

    boolean existsByMatchedOrderIdAndIsMatchedTrue(Integer matchedOrderId);
    Optional<BankTransaction> findTopByMatchedOrderIdAndIsMatchedTrueOrderByCreatedAtDesc(Integer matchedOrderId);

    Optional<BankTransaction> findByTransactionCode(String transactionCode);

    /** Find latest bank transaction linked to this order (MATCHED or REJECTED) */
    Optional<BankTransaction> findTopByMatchedOrderIdAndDeletedAtIsNullOrderByCreatedAtDesc(Integer matchedOrderId);

    List<BankTransaction> findAllByMatchedOrderId(Integer matchedOrderId);
}
