package com.webbanhang.shop.Repository.Categories;

import com.webbanhang.shop.Model.Categories.Category;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CategoryRepository extends JpaRepository<Category, Integer> {
    List<Category> findAllByDeletedAtIsNull();

    List<Category> findAllByDeletedAtIsNotNullOrderByDeletedAtDesc();
}
