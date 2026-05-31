package com.webbanhang.shop.Repository.Categories;

import com.webbanhang.shop.Model.Categories.CategoryImage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CategoryImageRepository extends JpaRepository<CategoryImage, Integer> {
    List<CategoryImage> findAllByCategoryCategoryIdOrderBySortOrderAsc(Integer categoryId);
}
