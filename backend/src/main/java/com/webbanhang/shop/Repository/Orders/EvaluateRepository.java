package com.webbanhang.shop.Repository.Orders;

import com.webbanhang.shop.Model.Orders.Evaluate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface EvaluateRepository extends JpaRepository<Evaluate, Integer> {

    List<Evaluate> findAllByProductProductIdOrderByCreatedAtDesc(Integer productId);

    List<Evaluate> findAllByCustomerCustomerIdOrderByCreatedAtDesc(Integer customerId);

    List<Evaluate> findAllByOrderItemIdIn(List<Integer> orderItemIds);

    Optional<Evaluate> findByOrderItemId(Integer orderItemId);

    Optional<Evaluate> findByCustomerCustomerIdAndProductProductId(Integer customerId, Integer productId);

    @Query("""
            select e.product.productId, e.product.productName,
                   count(e.evaluateId),
                   coalesce(sum(e.rating), 0),
                   (select min(pi.imageUrl) from ProductImage pi where pi.product.productId = e.product.productId and pi.isThumbnail = true)
            from Evaluate e
            group by e.product.productId, e.product.productName
            order by count(e.evaluateId) desc
            """)
    List<Object[]> aggregateEvaluateStatsByProduct();
}
