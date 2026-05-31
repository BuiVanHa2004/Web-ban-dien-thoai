package com.webbanhang.shop.Service.Brands;

import com.webbanhang.shop.DTO.Brands.BrandCreateUpdateDto;
import com.webbanhang.shop.Model.Brands.Brand;

import java.util.List;
import java.util.Optional;

public interface BrandService {
    List<Brand> findAllActive();

    List<Brand> findAllTrashed();

    Optional<Brand> findById(Integer id);

    Brand create(Brand brand);

    Optional<Brand> update(Integer id, Brand brand);

    Brand createFromDto(BrandCreateUpdateDto dto);

    Optional<Brand> updateFromDto(Integer id, BrandCreateUpdateDto dto);

    boolean softDelete(Integer id);

    boolean restore(Integer id);

    boolean deleteForever(Integer id);
}
