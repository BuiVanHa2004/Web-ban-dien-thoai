package com.webbanhang.shop.Repository.Inventory;

import com.webbanhang.shop.Model.Inventory.InventoryTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface InventoryTransactionRepository extends JpaRepository<InventoryTransaction, Long> {
    
    /**
     * Find all transactions for a variant (ordered by time)
     */
    List<InventoryTransaction> findByVariantIdOrderByCreatedAtDesc(Integer variantId);
    
    /**
     * Find transactions by reference (e.g., all transactions for an order)
     */
    List<InventoryTransaction> findByReferenceTypeAndReferenceIdOrderByCreatedAtDesc(
        String referenceType, 
        String referenceId
    );
    
    /**
     * Find transactions by order code
     */
    List<InventoryTransaction> findByOrderCodeOrderByCreatedAtDesc(String orderCode);
    
    /**
     * Find transactions by type
     */
    List<InventoryTransaction> findByTransactionTypeOrderByCreatedAtDesc(
        InventoryTransaction.TransactionType transactionType
    );
}
