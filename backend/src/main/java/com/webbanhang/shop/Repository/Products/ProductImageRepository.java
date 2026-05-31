package com.webbanhang.shop.Repository.Products;

import com.webbanhang.shop.Model.Products.ProductImage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ProductImageRepository extends JpaRepository<ProductImage, Integer> {
    List<ProductImage> findAllByProductProductId(Integer productId);

    List<ProductImage> findAllByProductProductIdOrderBySortOrderAsc(Integer productId);

    ProductImage findByProductProductIdAndIsThumbnailTrue(Integer productId);
}
