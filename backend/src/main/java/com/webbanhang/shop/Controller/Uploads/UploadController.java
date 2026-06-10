package com.webbanhang.shop.Controller.Uploads;

import com.webbanhang.shop.Service.Storage.MinioStorageService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/api/uploads")
public class UploadController {

    private final MinioStorageService minioStorageService;

    public UploadController(MinioStorageService minioStorageService) {
        this.minioStorageService = minioStorageService;
    }

    @PostMapping(value = "/brands", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, String>> uploadBrand(@RequestParam("file") MultipartFile file) {
        MinioStorageService.UploadedObject uploaded = minioStorageService.uploadBrandImage(file);
        return ResponseEntity.ok(Map.of(
                "url", uploaded.url(),
                "objectName", uploaded.objectName()
        ));
    }

    @PostMapping(value = "/products", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, String>> uploadProduct(@RequestParam("file") MultipartFile file) {
        MinioStorageService.UploadedObject uploaded = minioStorageService.uploadProductImage(file);
        return ResponseEntity.ok(Map.of(
                "url", uploaded.url(),
                "objectName", uploaded.objectName()
        ));
    }

    @PostMapping(value = "/news", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, String>> uploadNews(@RequestParam("file") MultipartFile file) {
        MinioStorageService.UploadedObject uploaded = minioStorageService.uploadNewsImage(file);
        return ResponseEntity.ok(Map.of(
                "url", uploaded.url(),
                "objectName", uploaded.objectName()
        ));
    }

    @PostMapping(value = "/categories", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, String>> uploadCategory(@RequestParam("file") MultipartFile file) {
        MinioStorageService.UploadedObject uploaded = minioStorageService.uploadCategoryImage(file);
        return ResponseEntity.ok(Map.of(
                "url", uploaded.url(),
                "objectName", uploaded.objectName()
        ));
    }

    @PostMapping(value = "/banners", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, String>> uploadBanner(@RequestParam("file") MultipartFile file) {
        MinioStorageService.UploadedObject uploaded = minioStorageService.uploadBannerImage(file);
        return ResponseEntity.ok(Map.of(
                "url", uploaded.url(),
                "objectName", uploaded.objectName()
        ));
    }

    @PostMapping(value = "/avatars", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, String>> uploadAvatar(@RequestParam("file") MultipartFile file) {
        try {
            MinioStorageService.UploadedObject uploaded = minioStorageService.uploadAvatarImage(file);
            return ResponseEntity.ok(Map.of(
                    "url", uploaded.url(),
                    "objectName", uploaded.objectName()
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/products/delete")
    public ResponseEntity<Map<String, String>> deleteProductImage(@RequestBody Map<String, String> request) {
        String url = request.get("url");
        if (url == null || url.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "URL is required"));
        }

        // Extract object name from URL
        String objectName = url;
        int lastSlash = url.lastIndexOf('/');
        if (lastSlash >= 0 && lastSlash < url.length() - 1) {
            if (url.contains("/products/")) {
                int productsIndex = url.indexOf("/products/");
                if (productsIndex >= 0) {
                    objectName = url.substring(productsIndex + 1);
                }
            }
        }

        minioStorageService.deleteObjectIfExists(objectName);
        return ResponseEntity.ok(Map.of("message", "Image deleted successfully"));
    }
}
