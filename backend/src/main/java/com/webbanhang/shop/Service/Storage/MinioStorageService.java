package com.webbanhang.shop.Service.Storage;

import com.webbanhang.shop.Config.MinIOConfig;
import io.minio.BucketExistsArgs;
import io.minio.GetObjectArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.RemoveObjectArgs;
import io.minio.StatObjectArgs;
import io.minio.StatObjectResponse;
import io.minio.errors.ErrorResponseException;
import lombok.Getter;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.Objects;
import java.util.UUID;

@Service
public class MinioStorageService {

    private final MinioClient minioClient;
    private final MinIOConfig minIOConfig;

    public MinioStorageService(MinioClient minioClient, MinIOConfig minIOConfig) {
        this.minioClient = minioClient;
        this.minIOConfig = minIOConfig;
    }

    public UploadedObject uploadBrandImage(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File is empty");
        }

        String original = Objects.toString(file.getOriginalFilename(), "");
        String ext = "";
        int dot = original.lastIndexOf('.');
        if (dot >= 0 && dot < original.length() - 1) {
            ext = original.substring(dot).toLowerCase();
        }

        String objectName = "brands/" + UUID.randomUUID() + ext;

        String contentType = file.getContentType();
        if (contentType == null || contentType.isBlank()) {
            if (".png".equals(ext)) {
                contentType = "image/png";
            } else if (".jpg".equals(ext) || ".jpeg".equals(ext)) {
                contentType = "image/jpeg";
            } else if (".webp".equals(ext)) {
                contentType = "image/webp";
            } else if (".gif".equals(ext)) {
                contentType = "image/gif";
            } else {
                contentType = "application/octet-stream";
            }
        }

        try {
            System.out.println("========== UPLOAD BRAND IMAGE ==========");
            System.out.println("Original filename: " + original);
            System.out.println("Object name: " + objectName);
            System.out.println("File size: " + file.getSize() + " bytes");
            System.out.println("Content type: " + contentType);
            System.out.println("Bucket: " + minIOConfig.getBucketName());
            System.out.println("Endpoint: " + minIOConfig.getEndpoint());
            
            ensureBucketExists(minIOConfig.getBucketName());
            try (InputStream in = file.getInputStream()) {
                PutObjectArgs args = PutObjectArgs.builder()
                        .bucket(minIOConfig.getBucketName())
                        .object(objectName)
                        .stream(in, file.getSize(), -1)
                        .contentType(contentType)
                        .build();
                minioClient.putObject(args);
                System.out.println("SUCCESS: Brand image uploaded to Backblaze B2");
            }
            String url = minIOConfig.getUrlPrefix().replaceAll("/+$", "") + "/" + objectName;
            System.out.println("Generated URL: " + url);
            System.out.println("========================================");
            return new UploadedObject(objectName, url);
        } catch (Exception e) {
            System.err.println("ERROR: Upload brand image to Backblaze B2 failed: " + objectName);
            e.printStackTrace();
            throw new RuntimeException("Upload to MinIO failed", e);
        }
    }

    public UploadedObject uploadContactImage(MultipartFile file) {
        return uploadImageToFolder("contact", file);
    }

    public UploadedObject uploadContactReplyImage(MultipartFile file) {
        return uploadImageToFolder("contact_replies", file);
    }

    public UploadedObject uploadImageToFolder(String folder, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File is empty");
        }

        String original = Objects.toString(file.getOriginalFilename(), "");
        String ext = "";
        int dot = original.lastIndexOf('.');
        if (dot >= 0 && dot < original.length() - 1) {
            ext = original.substring(dot).toLowerCase();
        }

        String objectName = folder.replaceAll("^/+|/+$", "") + "/" + UUID.randomUUID() + ext;

        String contentType = file.getContentType();
        if (contentType == null || contentType.isBlank()) {
            if (".png".equals(ext)) {
                contentType = "image/png";
            } else if (".jpg".equals(ext) || ".jpeg".equals(ext)) {
                contentType = "image/jpeg";
            } else if (".webp".equals(ext)) {
                contentType = "image/webp";
            } else if (".gif".equals(ext)) {
                contentType = "image/gif";
            } else {
                contentType = "application/octet-stream";
            }
        }

        try {
            System.out.println("========== UPLOAD IMAGE ==========");
            System.out.println("Folder: " + folder);
            System.out.println("Original filename: " + original);
            System.out.println("Object name: " + objectName);
            System.out.println("File size: " + file.getSize() + " bytes");
            System.out.println("Content type: " + contentType);
            System.out.println("Bucket: " + minIOConfig.getBucketName());
            System.out.println("Endpoint: " + minIOConfig.getEndpoint());
            
            ensureBucketExists(minIOConfig.getBucketName());
            try (InputStream in = file.getInputStream()) {
                PutObjectArgs args = PutObjectArgs.builder()
                        .bucket(minIOConfig.getBucketName())
                        .object(objectName)
                        .stream(in, file.getSize(), -1)
                        .contentType(contentType)
                        .build();
                minioClient.putObject(args);
                System.out.println("SUCCESS: File uploaded to Backblaze B2");
            }
            String url = minIOConfig.getUrlPrefix().replaceAll("/+$", "") + "/" + objectName;
            System.out.println("Generated URL: " + url);
            System.out.println("====================================");
            return new UploadedObject(objectName, url);
        } catch (Exception e) {
            System.err.println("ERROR: Upload to Backblaze B2 failed for: " + objectName);
            e.printStackTrace();
            throw new RuntimeException("Upload to MinIO failed", e);
        }
    }

    public UploadedObject uploadNewsImage(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File is empty");
        }

        String original = Objects.toString(file.getOriginalFilename(), "");
        String ext = "";
        int dot = original.lastIndexOf('.');
        if (dot >= 0 && dot < original.length() - 1) {
            ext = original.substring(dot);
        }

        String objectName = "news/" + UUID.randomUUID() + ext;

        try {
            ensureBucketExists(minIOConfig.getBucketName());
            try (InputStream in = file.getInputStream()) {
                PutObjectArgs args = PutObjectArgs.builder()
                        .bucket(minIOConfig.getBucketName())
                        .object(objectName)
                        .stream(in, file.getSize(), -1)
                        .contentType(file.getContentType())
                        .build();
                minioClient.putObject(args);
            }
            String url = minIOConfig.getUrlPrefix().replaceAll("/+$", "") + "/" + objectName;
            return new UploadedObject(objectName, url);
        } catch (Exception e) {
            throw new RuntimeException("Upload to MinIO failed", e);
        }
    }

    public UploadedObject uploadProductImage(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File is empty");
        }

        String original = Objects.toString(file.getOriginalFilename(), "");
        String ext = "";
        int dot = original.lastIndexOf('.');
        if (dot >= 0 && dot < original.length() - 1) {
            ext = original.substring(dot);
        }

        String objectName = "products/" + UUID.randomUUID() + ext;

        try {
            ensureBucketExists(minIOConfig.getBucketName());
            try (InputStream in = file.getInputStream()) {
                PutObjectArgs args = PutObjectArgs.builder()
                        .bucket(minIOConfig.getBucketName())
                        .object(objectName)
                        .stream(in, file.getSize(), -1)
                        .contentType(file.getContentType())
                        .build();
                minioClient.putObject(args);
            }
            String url = minIOConfig.getUrlPrefix().replaceAll("/+$", "") + "/" + objectName;
            return new UploadedObject(objectName, url);
        } catch (Exception e) {
            throw new RuntimeException("Upload to MinIO failed", e);
        }
    }

    public UploadedObject uploadCategoryImage(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File is empty");
        }

        String original = Objects.toString(file.getOriginalFilename(), "");
        String ext = "";
        int dot = original.lastIndexOf('.');
        if (dot >= 0 && dot < original.length() - 1) {
            ext = original.substring(dot).toLowerCase();
        }

        String objectName = "categories/" + UUID.randomUUID() + ext;

        String contentType = file.getContentType();
        if (contentType == null || contentType.isBlank()) {
            if (".png".equals(ext)) {
                contentType = "image/png";
            } else if (".jpg".equals(ext) || ".jpeg".equals(ext)) {
                contentType = "image/jpeg";
            } else if (".webp".equals(ext)) {
                contentType = "image/webp";
            } else if (".gif".equals(ext)) {
                contentType = "image/gif";
            } else {
                contentType = "application/octet-stream";
            }
        }

        try {
            ensureBucketExists(minIOConfig.getBucketName());
            try (InputStream in = file.getInputStream()) {
                PutObjectArgs args = PutObjectArgs.builder()
                        .bucket(minIOConfig.getBucketName())
                        .object(objectName)
                        .stream(in, file.getSize(), -1)
                        .contentType(contentType)
                        .build();
                minioClient.putObject(args);
            }
            String url = minIOConfig.getUrlPrefix().replaceAll("/+$", "") + "/" + objectName;
            return new UploadedObject(objectName, url);
        } catch (Exception e) {
            throw new RuntimeException("Upload to MinIO failed", e);
        }
    }

    public void deleteObjectIfExists(String objectName) {
        if (objectName == null || objectName.isBlank()) {
            return;
        }

        try {
            minioClient.removeObject(
                    RemoveObjectArgs.builder()
                            .bucket(minIOConfig.getBucketName())
                            .object(objectName)
                            .build()
            );
        } catch (Exception e) {
            // ignore
        }
    }

    public void deleteByUrl(String url) {
        String objectName = extractObjectNameFromUrl(url);
        if (objectName != null) {
            deleteObjectIfExists(objectName);
        }
    }

    public String extractObjectNameFromUrl(String url) {
        if (url == null || url.isBlank()) {
            return null;
        }
        String marker = "/api/files/";
        int idx = url.indexOf(marker);
        if (idx >= 0) {
            String objectName = url.substring(idx + marker.length());
            return objectName.isBlank() ? null : objectName;
        }
        String prefix = minIOConfig.getUrlPrefix().replaceAll("/+$", "") + "/";
        if (url.startsWith(prefix)) {
            String objectName = url.substring(prefix.length());
            return objectName.isBlank() ? null : objectName;
        }
        return null;
    }

    public boolean objectExists(String objectName) {
        if (objectName == null || objectName.isBlank()) {
            return false;
        }

        try {
            minioClient.statObject(
                    StatObjectArgs.builder()
                            .bucket(minIOConfig.getBucketName())
                            .object(objectName)
                            .build()
            );
            return true;
        } catch (ErrorResponseException e) {
            return false;
        } catch (Exception e) {
            return false;
        }
    }

    public FileObject getObject(String objectName) {
        if (objectName == null || objectName.isBlank()) {
            throw new IllegalArgumentException("Object name is empty");
        }

        try {
            StatObjectResponse stat = minioClient.statObject(
                    StatObjectArgs.builder()
                            .bucket(minIOConfig.getBucketName())
                            .object(objectName)
                            .build()
            );

            InputStream stream = minioClient.getObject(
                    GetObjectArgs.builder()
                            .bucket(minIOConfig.getBucketName())
                            .object(objectName)
                            .build()
            );

            String contentType = stat.contentType();
            long size = stat.size();
            return new FileObject(objectName, contentType, size, stream);
        } catch (Exception e) {
            throw new RuntimeException("Read from MinIO failed", e);
        }
    }

    private void ensureBucketExists(String bucket) {
        try {
            boolean exists = minioClient.bucketExists(BucketExistsArgs.builder().bucket(bucket).build());
            if (!exists) {
                minioClient.makeBucket(MakeBucketArgs.builder().bucket(bucket).build());
            }
        } catch (Exception e) {
            throw new RuntimeException("Ensure bucket failed", e);
        }
    }

    public UploadedObject uploadEvaluateImage(MultipartFile file) {
        return uploadImageToFolder("evaluates", file);
    }

    public UploadedObject uploadBannerImage(MultipartFile file) {
        return uploadImageToFolder("banners", file);
    }

    public UploadedObject uploadAvatarImage(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File is empty");
        }

        // Validate file size (max 2MB for avatars)
        long maxSize = 2 * 1024 * 1024; // 2MB
        if (file.getSize() > maxSize) {
            throw new IllegalArgumentException("File size exceeds maximum limit of 2MB");
        }

        String original = Objects.toString(file.getOriginalFilename(), "");
        String ext = "";
        int dot = original.lastIndexOf('.');
        if (dot >= 0 && dot < original.length() - 1) {
            ext = original.substring(dot).toLowerCase();
        }

        // Validate file format
        if (!".jpg".equals(ext) && !".jpeg".equals(ext) && !".png".equals(ext) && !".webp".equals(ext) && !".gif".equals(ext)) {
            throw new IllegalArgumentException("Unsupported file format. Only JPG, PNG, WebP and GIF are allowed");
        }

        String objectName = "avatars/" + UUID.randomUUID() + ext;

        String contentType = file.getContentType();
        if (contentType == null || contentType.isBlank()) {
            if (".png".equals(ext)) {
                contentType = "image/png";
            } else if (".jpg".equals(ext) || ".jpeg".equals(ext)) {
                contentType = "image/jpeg";
            } else if (".webp".equals(ext)) {
                contentType = "image/webp";
            } else if (".gif".equals(ext)) {
                contentType = "image/gif";
            } else {
                contentType = "application/octet-stream";
            }
        }

        try {
            ensureBucketExists(minIOConfig.getBucketName());
            try (InputStream in = file.getInputStream()) {
                PutObjectArgs args = PutObjectArgs.builder()
                        .bucket(minIOConfig.getBucketName())
                        .object(objectName)
                        .stream(in, file.getSize(), -1)
                        .contentType(contentType)
                        .build();
                minioClient.putObject(args);
            }
            String url = minIOConfig.getUrlPrefix().replaceAll("/+$", "") + "/" + objectName;
            return new UploadedObject(objectName, url);
        } catch (Exception e) {
            throw new RuntimeException("Upload to MinIO failed", e);
        }
    }

    public UploadedObject uploadChatImage(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File is empty");
        }

        // Validate file size (max 10MB for chat images)
        long maxSize = 10 * 1024 * 1024; // 10MB
        if (file.getSize() > maxSize) {
            throw new IllegalArgumentException("File size exceeds maximum limit of 10MB");
        }

        String original = Objects.toString(file.getOriginalFilename(), "");
        String ext = "";
        int dot = original.lastIndexOf('.');
        if (dot >= 0 && dot < original.length() - 1) {
            ext = original.substring(dot).toLowerCase();
        }

        // Validate file format
        if (!".jpg".equals(ext) && !".jpeg".equals(ext) && !".png".equals(ext) && !".webp".equals(ext) && !".gif".equals(ext)) {
            throw new IllegalArgumentException("Unsupported file format. Only JPG, PNG, WebP and GIF are allowed");
        }

        String objectName = "chat-images/" + UUID.randomUUID() + ext;

        String contentType = file.getContentType();
        if (contentType == null || contentType.isBlank()) {
            if (".png".equals(ext)) {
                contentType = "image/png";
            } else if (".jpg".equals(ext) || ".jpeg".equals(ext)) {
                contentType = "image/jpeg";
            } else if (".webp".equals(ext)) {
                contentType = "image/webp";
            } else if (".gif".equals(ext)) {
                contentType = "image/gif";
            } else {
                contentType = "application/octet-stream";
            }
        }

        try {
            ensureBucketExists(minIOConfig.getBucketName());
            try (InputStream in = file.getInputStream()) {
                PutObjectArgs args = PutObjectArgs.builder()
                        .bucket(minIOConfig.getBucketName())
                        .object(objectName)
                        .stream(in, file.getSize(), -1)
                        .contentType(contentType)
                        .build();
                minioClient.putObject(args);
            }
            String url = minIOConfig.getUrlPrefix().replaceAll("/+$", "") + "/" + objectName;
            return new UploadedObject(objectName, url);
        } catch (Exception e) {
            throw new RuntimeException("Upload to MinIO failed", e);
        }
    }

    /**
     * Upload PDF certificate for order delivery
     * 
     * @param pdfBytes PDF file content as byte array
     * @param orderCode Order code to include in filename
     * @return UploadedObject containing objectName and public URL
     */
    public UploadedObject uploadOrderCertificatePdf(byte[] pdfBytes, String orderCode) {
        if (pdfBytes == null || pdfBytes.length == 0) {
            throw new IllegalArgumentException("PDF content is empty");
        }
        if (orderCode == null || orderCode.isBlank()) {
            throw new IllegalArgumentException("Order code is required");
        }

        String objectName = "certificates/Chung-nhan-don-hang-" + orderCode + ".pdf";

        try {
            System.out.println("========== UPLOAD ORDER CERTIFICATE PDF ==========");
            System.out.println("Order code: " + orderCode);
            System.out.println("Object name: " + objectName);
            System.out.println("PDF size: " + pdfBytes.length + " bytes");
            System.out.println("Bucket: " + minIOConfig.getBucketName());
            System.out.println("Endpoint: " + minIOConfig.getEndpoint());
            
            ensureBucketExists(minIOConfig.getBucketName());
            
            try (InputStream in = new java.io.ByteArrayInputStream(pdfBytes)) {
                PutObjectArgs args = PutObjectArgs.builder()
                        .bucket(minIOConfig.getBucketName())
                        .object(objectName)
                        .stream(in, pdfBytes.length, -1)
                        .contentType("application/pdf")
                        .build();
                minioClient.putObject(args);
                System.out.println("SUCCESS: Certificate PDF uploaded to MinIO");
            }
            
            String url = minIOConfig.getUrlPrefix().replaceAll("/+$", "") + "/" + objectName;
            System.out.println("Generated URL: " + url);
            System.out.println("==================================================");
            return new UploadedObject(objectName, url);
        } catch (Exception e) {
            System.err.println("ERROR: Upload certificate PDF to MinIO failed: " + objectName);
            e.printStackTrace();
            throw new RuntimeException("Upload certificate PDF to MinIO failed", e);
        }
    }

    public record UploadedObject(String objectName, String url) {
    }

    @Getter
    public static class FileObject {
        private final String objectName;
        private final String contentType;
        private final long size;
        private final InputStream inputStream;

        public FileObject(String objectName, String contentType, long size, InputStream inputStream) {
            this.objectName = objectName;
            this.contentType = contentType;
            this.size = size;
            this.inputStream = inputStream;
        }
    }
}
