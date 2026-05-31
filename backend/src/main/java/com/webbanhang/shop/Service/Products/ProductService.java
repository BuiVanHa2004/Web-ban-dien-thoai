package com.webbanhang.shop.Service.Products;

import com.webbanhang.shop.DTO.Products.ProductUpsertRequest;
import com.webbanhang.shop.Model.Products.Product;

import java.util.List;
import java.util.Optional;

public interface ProductService {
    List<Product> findAllActive();

    List<Product> findAllActiveFiltered(
            String q,
            Integer categoryId
    );

    List<Product> findAllTrashed();

    Optional<Product> findById(Integer id);

    List<Product> findAllByIdIn(List<Integer> ids);

    Product create(ProductUpsertRequest req);

    Optional<Product> update(Integer id, ProductUpsertRequest req);

    boolean softDelete(Integer id);

    boolean restore(Integer id);

    boolean deleteForever(Integer id);
}
