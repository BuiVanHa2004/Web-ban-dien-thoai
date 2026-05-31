package com.webbanhang.shop.Repository.Products;

import com.webbanhang.shop.Model.Products.ProductColorImage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ProductColorImageRepository extends JpaRepository<ProductColorImage, Integer> {
    List<ProductColorImage> findAllByProductColorProductColorId(Integer productColorId);
}
