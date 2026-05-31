package com.webbanhang.shop.Service.Banners;

import com.webbanhang.shop.DTO.Banners.BannerDTO;

import java.util.List;

public interface BannerService {
    List<BannerDTO> getAllActive();
    List<BannerDTO> getTrash();
    BannerDTO getById(Integer id);
    BannerDTO create(BannerDTO bannerDTO);
    BannerDTO update(Integer id, BannerDTO bannerDTO);
    void softDelete(Integer id);
    void restore(Integer id);
    void deleteForever(Integer id);
}
