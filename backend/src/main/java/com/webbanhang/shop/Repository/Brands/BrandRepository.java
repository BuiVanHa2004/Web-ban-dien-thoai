package com.webbanhang.shop.Repository.Brands;

import com.webbanhang.shop.Model.Brands.Brand;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface BrandRepository extends JpaRepository<Brand, Integer> {
    @Query("SELECT b FROM Brand b LEFT JOIN FETCH b.brandImages WHERE b.deletedAt IS NULL")
    List<Brand> findAllByDeletedAtIsNull();

    @Query("SELECT b FROM Brand b LEFT JOIN FETCH b.brandImages WHERE b.deletedAt IS NOT NULL ORDER BY b.deletedAt DESC")
    List<Brand> findAllByDeletedAtIsNotNullOrderByDeletedAtDesc();

    @Query("SELECT b FROM Brand b LEFT JOIN FETCH b.brandImages WHERE b.brandId = :id")
    Optional<Brand> findByIdWithImages(Integer id);

    @Query("SELECT b FROM Brand b LEFT JOIN FETCH b.brandImages WHERE b.slug = :slug AND b.deletedAt IS NULL")
    Optional<Brand> findBySlug(@Param("slug") String slug);

    @Query("SELECT b FROM Brand b WHERE b.slug = :slug")
    Optional<Brand> findBySlugIncludeDeleted(@Param("slug") String slug);
}
