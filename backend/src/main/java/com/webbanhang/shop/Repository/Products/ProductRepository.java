package com.webbanhang.shop.Repository.Products;

import com.webbanhang.shop.Model.Products.Product;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ProductRepository extends JpaRepository<Product, Integer> {

    @EntityGraph(attributePaths = {"category", "productImages", "productColors", "productColors.colorImages", "productColors.variants", "productSpecs"})
    @Query("""
            select p from Product p
            where p.deletedAt is null
              and (p.isActive = true or p.isActive is null)
            """)
    List<Product> findAllVisibleWithGraph();

    @EntityGraph(attributePaths = {"category", "productImages", "productColors", "productColors.colorImages", "productColors.variants", "productSpecs"})
    List<Product> findAllByDeletedAtIsNotNullOrderByDeletedAtDesc();

    @EntityGraph(attributePaths = {"category", "productImages", "productColors", "productColors.colorImages", "productColors.variants", "productSpecs"})
    java.util.Optional<Product> findByProductId(Integer productId);

    @Query(value = """
            select p.product_id from products p
            where p.deleted_at is null
              and (p.is_active = 1 or p.is_active is null)
              and (:categoryId is null or p.category_id = :categoryId)
              and (
                    :q is null or :q = ''
                    or lower(p.product_name) like lower(concat('%', :q, '%'))
                    or lower(coalesce(p.product_description, '')) like lower(concat('%', :q, '%'))
              )
            """, nativeQuery = true)
    List<Integer> findAllActiveFilteredIds(
            @Param("q") String q,
            @Param("categoryId") Integer categoryId
    );

    @EntityGraph(attributePaths = {"category", "productImages", "productColors", "productColors.colorImages", "productColors.variants", "productSpecs"})
    @Query("""
            select p from Product p
            where p.deletedAt is null
              and (p.isActive = true or p.isActive is null)
              and p.productId in :ids
            """)
    List<Product> findAllActiveByProductIdInWithGraph(@Param("ids") List<Integer> ids);

    @EntityGraph(attributePaths = {"category", "productImages", "productColors", "productColors.colorImages", "productColors.variants", "productSpecs"})
    List<Product> findAllByProductIdIn(List<Integer> productIds);

    long countByCategoryCategoryIdAndDeletedAtIsNull(Integer categoryId);

    long countByBrandBrandIdAndDeletedAtIsNull(Integer brandId);
}
