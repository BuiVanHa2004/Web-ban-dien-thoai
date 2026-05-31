package com.webbanhang.shop.Repository.Products;

import com.webbanhang.shop.Model.Products.ProductColor;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ProductColorRepository extends JpaRepository<ProductColor, Integer> {
    List<ProductColor> findAllByProductProductId(Integer productId);
}
