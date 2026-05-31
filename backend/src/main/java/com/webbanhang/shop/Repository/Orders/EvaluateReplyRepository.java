package com.webbanhang.shop.Repository.Orders;

import com.webbanhang.shop.Model.Orders.EvaluateReply;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EvaluateReplyRepository extends JpaRepository<EvaluateReply, Integer> {

    Optional<EvaluateReply> findByEvaluate_EvaluateId(Integer evaluateId);

    List<EvaluateReply> findAllByEvaluate_EvaluateId(Integer evaluateId);

    List<EvaluateReply> findAllByEvaluate_EvaluateIdIn(List<Integer> evaluateIds);

    long deleteAllByEvaluate_EvaluateId(Integer evaluateId);
}
