package com.webbanhang.shop.Controller.Files;

import com.webbanhang.shop.Service.Storage.MinioStorageService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.InputStream;

@RestController
@RequestMapping("/api/files")
public class FileController {

    private final MinioStorageService minioStorageService;

    public FileController(MinioStorageService minioStorageService) {
        this.minioStorageService = minioStorageService;
    }

    @GetMapping("/**")
    public ResponseEntity<byte[]> getFile(HttpServletRequest request) {
        String path = request.getRequestURI();
        int idx = path.indexOf("/api/files/");
        String objectName = idx >= 0 ? path.substring(idx + "/api/files/".length()) : "";

        if (objectName.isBlank()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }

        MinioStorageService.FileObject obj;
        try {
            obj = minioStorageService.getObject(objectName);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }

        try (InputStream in = obj.getInputStream()) {
            byte[] bytes = in.readAllBytes();
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(obj.getContentType() != null ? MediaType.parseMediaType(obj.getContentType()) : MediaType.APPLICATION_OCTET_STREAM);
            headers.setContentLength(bytes.length);
            headers.setContentDisposition(ContentDisposition.inline().build());
            headers.setCacheControl("public, max-age=31536000, immutable");
            return new ResponseEntity<>(bytes, headers, HttpStatus.OK);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}
