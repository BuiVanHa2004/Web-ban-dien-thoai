package com.webbanhang.shop.Service.Categories;

import com.webbanhang.shop.Model.Categories.Category;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

public interface CategoryService {
    List<Category> findAllActive();

    List<Category> findAllTrashed();

    Optional<Category> findById(Integer id);

    Category create(Category category);

    Optional<Category> update(Integer id, Category category);

    Optional<Category> updatePriceSegments(Integer id, List<Integer> priceSegmentIds);

    Optional<Category> updatePriceSegmentRange(Integer id, BigDecimal minPrice, BigDecimal maxPrice);

    boolean softDelete(Integer id);

    boolean restore(Integer id);

    boolean deleteForever(Integer id);

    Category updateImages(Integer categoryId, List<String> imageUrls);
}
