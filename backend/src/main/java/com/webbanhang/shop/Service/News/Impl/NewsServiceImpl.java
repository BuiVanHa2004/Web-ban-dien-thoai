package com.webbanhang.shop.Service.News.Impl;

import com.webbanhang.shop.DTO.News.NewsUpsertRequest;
import com.webbanhang.shop.Model.News.News;
import com.webbanhang.shop.Model.News.NewsImage;
import com.webbanhang.shop.Repository.News.NewsRepository;
import com.webbanhang.shop.Service.News.NewsService;
import com.webbanhang.shop.Service.Storage.MinioStorageService;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@SuppressWarnings("null")
public class NewsServiceImpl implements NewsService {

    private final NewsRepository newsRepository;
    private final MinioStorageService minioStorageService;

    public NewsServiceImpl(NewsRepository newsRepository, MinioStorageService minioStorageService) {
        this.newsRepository = newsRepository;
        this.minioStorageService = minioStorageService;
    }

    @Override
    public List<News> findAllActive() {
        return newsRepository.findAllByDeletedAtIsNull();
    }

    @Override
    public List<News> findAllTrashed() {
        return newsRepository.findAllByDeletedAtIsNotNullOrderByDeletedAtDesc();
    }

    @Override
    public Optional<News> findById(Integer id) {
        Optional<News> newsOpt = newsRepository.findByIdWithImages(id);
        newsOpt.ifPresent(this::validateAndCleanImages);
        return newsOpt;
    }

    private void validateAndCleanImages(News news) {
        if (news.getNewsImages() == null || news.getNewsImages().isEmpty()) {
            return;
        }

        List<NewsImage> validImages = news.getNewsImages().stream()
                .filter(img -> {
                    if (img.getImageUrl() == null || img.getImageUrl().isBlank()) {
                        return false;
                    }
                    String objectName = extractObjectNameFromImageUrl(img.getImageUrl());
                    if (objectName == null) {
                        return false;
                    }
                    return minioStorageService.objectExists(objectName);
                })
                .collect(Collectors.toList());

        if (validImages.size() != news.getNewsImages().size()) {
            news.getNewsImages().clear();
            news.getNewsImages().addAll(validImages);
            // Re-sort by sortOrder
            for (int i = 0; i < validImages.size(); i++) {
                validImages.get(i).setSortOrder(i);
            }
            newsRepository.save(news);
        }
    }

    @Override
    public News create(News news) {
        news.setNewsId(null);
        return newsRepository.save(news);
    }

    @Override
    public Optional<News> update(Integer id, News news) {
        return newsRepository.findByIdWithImages(id).map(existing -> {
            existing.setTitle(news.getTitle());
            existing.setSlug(news.getSlug());
            existing.setDescription(news.getDescription());

            // Handle news images
            if (news.getNewsImages() != null) {
                // Get old image URLs
                List<String> oldImageUrls = existing.getNewsImages().stream()
                        .map(NewsImage::getImageUrl)
                        .collect(Collectors.toList());

                // Get new image URLs
                List<String> newImageUrls = news.getNewsImages().stream()
                        .map(NewsImage::getImageUrl)
                        .collect(Collectors.toList());

                // Delete old images that are not in new images
                oldImageUrls.stream()
                        .filter(oldUrl -> !newImageUrls.contains(oldUrl))
                        .forEach(oldUrl -> {
                            String objectName = extractObjectNameFromImageUrl(oldUrl);
                            if (objectName != null) {
                                minioStorageService.deleteObjectIfExists(objectName);
                            }
                        });

                // Update news images
                existing.getNewsImages().clear();
                for (int i = 0; i < news.getNewsImages().size(); i++) {
                    NewsImage newImage = news.getNewsImages().get(i);
                    newImage.setNews(existing);
                    newImage.setSortOrder(i);
                    existing.getNewsImages().add(newImage);
                }
            }

            return newsRepository.save(existing);
        });
    }

    @Override
    public News createFromDto(NewsUpsertRequest dto) {
        // Check if slug already exists (including deleted news)
        if (dto.slug() != null && !dto.slug().trim().isEmpty()) {
            newsRepository.findBySlugIncludeDeleted(dto.slug()).ifPresent(existing -> {
                throw new RuntimeException("Tin tức với slug này đã tồn tại");
            });
        }

        News news = new News();
        news.setTitle(dto.newsTitle());
        news.setSlug(dto.slug());
        news.setDescription(dto.newsDescribe());

        // Convert image URLs to NewsImage entities
        if (dto.newsImages() != null && !dto.newsImages().isEmpty()) {
            for (int i = 0; i < dto.newsImages().size(); i++) {
                NewsImage newsImage = new NewsImage();
                newsImage.setImageUrl(dto.newsImages().get(i));
                newsImage.setSortOrder(i);
                newsImage.setNews(news);
                news.getNewsImages().add(newsImage);
            }
        }

        return newsRepository.save(news);
    }

    @Override
    public Optional<News> updateFromDto(Integer id, NewsUpsertRequest dto) {
        return newsRepository.findByIdWithImages(id).map(existing -> {
            // Check if slug already exists (excluding current news, including deleted news)
            if (dto.slug() != null && !dto.slug().trim().isEmpty()) {
                newsRepository.findBySlugIncludeDeleted(dto.slug()).ifPresent(newsWithSameSlug -> {
                    if (!newsWithSameSlug.getNewsId().equals(id)) {
                        throw new RuntimeException("Tin tức với slug này đã tồn tại");
                    }
                });
            }

            existing.setTitle(dto.newsTitle());
            existing.setSlug(dto.slug());
            existing.setDescription(dto.newsDescribe());

            // Handle news images
            if (dto.newsImages() != null) {
                // Get old image URLs
                List<String> oldImageUrls = existing.getNewsImages().stream()
                        .map(NewsImage::getImageUrl)
                        .collect(Collectors.toList());

                // Get new image URLs
                List<String> newImageUrls = dto.newsImages();

                // Delete old images that are not in new images
                oldImageUrls.stream()
                        .filter(oldUrl -> !newImageUrls.contains(oldUrl))
                        .forEach(oldUrl -> {
                            String objectName = extractObjectNameFromImageUrl(oldUrl);
                            if (objectName != null) {
                                minioStorageService.deleteObjectIfExists(objectName);
                            }
                        });

                // Update news images
                existing.getNewsImages().clear();
                for (int i = 0; i < dto.newsImages().size(); i++) {
                    NewsImage newsImage = new NewsImage();
                    newsImage.setImageUrl(dto.newsImages().get(i));
                    newsImage.setSortOrder(i);
                    newsImage.setNews(existing);
                    existing.getNewsImages().add(newsImage);
                }
            }

            return newsRepository.save(existing);
        });
    }

    @Override
    public boolean softDelete(Integer id) {
        return newsRepository.findById(id).map(existing -> {
            if (existing.getDeletedAt() != null) {
                return true;
            }
            existing.setDeletedAt(Instant.now());
            newsRepository.save(existing);
            return true;
        }).orElse(false);
    }

    @Override
    public boolean restore(Integer id) {
        return newsRepository.findById(id).map(existing -> {
            existing.setDeletedAt(null);
            newsRepository.save(existing);
            return true;
        }).orElse(false);
    }

    @Override
    public boolean deleteForever(Integer id) {
        return newsRepository.findById(id).map(existing -> {
            // Delete all associated images from MinIO
            if (existing.getNewsImages() != null) {
                existing.getNewsImages().forEach(newsImage -> {
                    String objectName = extractObjectNameFromImageUrl(newsImage.getImageUrl());
                    if (objectName != null) {
                        minioStorageService.deleteObjectIfExists(objectName);
                    }
                });
            }
            newsRepository.deleteById(id);
            return true;
        }).orElse(false);
    }

    private String extractObjectNameFromImageUrl(String imageUrl) {
        if (imageUrl == null || imageUrl.isBlank()) {
            return null;
        }

        String marker = "/api/files/";
        int idx = imageUrl.indexOf(marker);
        if (idx < 0) {
            return null;
        }

        String objectName = imageUrl.substring(idx + marker.length());
        if (objectName.isBlank()) {
            return null;
        }

        if (!objectName.startsWith("news/")) {
            return null;
        }

        return objectName;
    }
}
