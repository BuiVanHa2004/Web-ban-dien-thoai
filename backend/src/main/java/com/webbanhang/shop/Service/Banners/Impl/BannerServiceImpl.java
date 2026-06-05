package com.webbanhang.shop.Service.Banners.Impl;

import com.webbanhang.shop.DTO.Banners.BannerDTO;
import com.webbanhang.shop.DTO.Banners.BannerImageDTO;
import com.webbanhang.shop.Model.Banners.Banner;
import com.webbanhang.shop.Model.Banners.BannerImage;
import com.webbanhang.shop.Repository.Banners.BannerRepository;
import com.webbanhang.shop.Service.Banners.BannerService;
import com.webbanhang.shop.Service.Storage.MinioStorageService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
@SuppressWarnings("null")
public class BannerServiceImpl implements BannerService {

    private final BannerRepository bannerRepository;
    private final MinioStorageService minioStorageService;

    public BannerServiceImpl(BannerRepository bannerRepository, MinioStorageService minioStorageService) {
        this.bannerRepository = bannerRepository;
        this.minioStorageService = minioStorageService;
    }

    @Override
    public List<BannerDTO> getAllActive() {
        return bannerRepository.findAllActive().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Override
    public List<BannerDTO> getTrash() {
        return bannerRepository.findAllTrashed().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Override
    public BannerDTO getById(Integer id) {
        Banner banner = bannerRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy banner"));
        return convertToDTO(banner);
    }

    @Override
    public BannerDTO create(BannerDTO bannerDTO) {
        Banner banner = new Banner();
        banner.setPosition(bannerDTO.getPosition());
        banner.setIsActive(bannerDTO.getIsActive() != null ? bannerDTO.getIsActive() : true);
        banner.setStartDate(bannerDTO.getStartDate());
        banner.setEndDate(bannerDTO.getEndDate());
        banner.setCreatedAt(Instant.now());
        banner.setUpdatedAt(Instant.now());
        
        // Save banner first to get ID
        Banner savedBanner = bannerRepository.save(banner);
        
        // Then handle images
        if (bannerDTO.getBannerImages() != null) {
            for (int i = 0; i < bannerDTO.getBannerImages().size(); i++) {
                BannerImageDTO imgDto = bannerDTO.getBannerImages().get(i);
                BannerImage img = new BannerImage();
                img.setImageUrl(imgDto.getImageUrl());
                img.setTitle(imgDto.getTitle());
                img.setSubtitle(imgDto.getSubtitle());
                img.setLinkUrl(imgDto.getLinkUrl());
                img.setSortOrder(imgDto.getSortOrder() != null ? imgDto.getSortOrder() : i);
                img.setBanner(savedBanner);
                img.setCreatedAt(Instant.now());
                savedBanner.getBannerImages().add(img);
            }
            // Save again with images
            savedBanner = bannerRepository.save(savedBanner);
        }
        
        return convertToDTO(savedBanner);
    }

    @Override
    public BannerDTO update(Integer id, BannerDTO bannerDTO) {
        Banner banner = bannerRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy banner"));
        
        // Clean up old images from storage if they are replaced
        List<String> newUrls = bannerDTO.getBannerImages().stream()
                .map(BannerImageDTO::getImageUrl)
                .collect(Collectors.toList());
        
        banner.getBannerImages().forEach(img -> {
            if (!newUrls.contains(img.getImageUrl())) {
                deleteFileFromStorage(img.getImageUrl());
            }
        });

        updateEntityFromDTO(banner, bannerDTO);
        Banner saved = bannerRepository.save(banner);
        return convertToDTO(saved);
    }

    @Override
    public void softDelete(Integer id) {
        Banner banner = bannerRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy banner"));
        banner.setDeletedAt(Instant.now());
        bannerRepository.save(banner);
    }

    @Override
    public void restore(Integer id) {
        Banner banner = bannerRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy banner"));
        banner.setDeletedAt(null);
        bannerRepository.save(banner);
    }

    @Override
    public void deleteForever(Integer id) {
        Banner banner = bannerRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy banner"));
        
        // Delete all images from storage
        banner.getBannerImages().forEach(img -> deleteFileFromStorage(img.getImageUrl()));
        
        bannerRepository.delete(banner);
    }

    private BannerDTO convertToDTO(Banner banner) {
        BannerDTO dto = new BannerDTO();
        dto.setBannerId(banner.getBannerId());
        dto.setPosition(banner.getPosition());
        dto.setIsActive(banner.getIsActive());
        dto.setStartDate(banner.getStartDate());
        dto.setEndDate(banner.getEndDate());
        dto.setCreatedAt(banner.getCreatedAt());
        dto.setUpdatedAt(banner.getUpdatedAt());
        dto.setDeletedAt(banner.getDeletedAt());

        if (banner.getBannerImages() != null) {
            dto.setBannerImages(banner.getBannerImages().stream().map(img -> {
                BannerImageDTO imgDto = new BannerImageDTO();
                imgDto.setBannerImageId(img.getBannerImageId());
                imgDto.setImageUrl(img.getImageUrl());
                imgDto.setTitle(img.getTitle());
                imgDto.setSubtitle(img.getSubtitle());
                imgDto.setLinkUrl(img.getLinkUrl());
                imgDto.setSortOrder(img.getSortOrder());
                return imgDto;
            }).collect(Collectors.toList()));
        }
        return dto;
    }

    private void updateEntityFromDTO(Banner banner, BannerDTO dto) {
        banner.setPosition(dto.getPosition());
        banner.setIsActive(dto.getIsActive());
        banner.setStartDate(dto.getStartDate());
        banner.setEndDate(dto.getEndDate());

        if (dto.getBannerImages() != null) {
            banner.getBannerImages().clear();
            for (int i = 0; i < dto.getBannerImages().size(); i++) {
                BannerImageDTO imgDto = dto.getBannerImages().get(i);
                BannerImage img = new BannerImage();
                img.setImageUrl(imgDto.getImageUrl());
                img.setTitle(imgDto.getTitle());
                img.setSubtitle(imgDto.getSubtitle());
                img.setLinkUrl(imgDto.getLinkUrl());
                img.setSortOrder(imgDto.getSortOrder() != null ? imgDto.getSortOrder() : i);
                img.setBanner(banner);
                banner.getBannerImages().add(img);
            }
        }
    }

    private void deleteFileFromStorage(String imageUrl) {
        if (imageUrl == null || imageUrl.isBlank()) return;
        String marker = "/api/files/";
        int idx = imageUrl.indexOf(marker);
        if (idx >= 0) {
            String objectName = imageUrl.substring(idx + marker.length());
            if (objectName.startsWith("banners/")) {
                minioStorageService.deleteObjectIfExists(objectName);
            }
        }
    }
}
