package com.webbanhang.shop.Repository.Products;

import com.webbanhang.shop.Model.Products.ProductVariant;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ProductVariantRepository extends JpaRepository<ProductVariant, Integer> {
    
    @EntityGraph(attributePaths = {"productColor", "productColor.product"})
    Optional<ProductVariant> findByVariantId(Integer variantId);

    List<ProductVariant> findAllByProductColorProductColorId(Integer productColorId);

    Optional<ProductVariant> findByProductColorProductColorIdAndRamGbAndStorageGb(Integer productColorId, Integer ramGb, Integer storageGb);
}

