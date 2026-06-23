package com.webbanhang.shop.Controller.Files;

import com.webbanhang.shop.Service.Storage.MinioStorageService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.InputStream;

@RestController
@RequestMapping("/api/files")
@CrossOrigin(origins = "*", allowedHeaders = "*", methods = {org.springframework.web.bind.annotation.RequestMethod.GET, org.springframework.web.bind.annotation.RequestMethod.OPTIONS})
public class FileController {

    private final MinioStorageService minioStorageService;

    public FileController(MinioStorageService minioStorageService) {
        this.minioStorageService = minioStorageService;
    }

    @GetMapping("/**")
    public ResponseEntity<byte[]> getFile(HttpServletRequest request) {
        System.out.println("========== FILE REQUEST ==========");
        System.out.println("Request URI: " + request.getRequestURI());
        System.out.println("Request URL: " + request.getRequestURL());
        System.out.println("Method: " + request.getMethod());
        
        String path = request.getRequestURI();
        int idx = path.indexOf("/api/files/");
        String objectName = idx >= 0 ? path.substring(idx + "/api/files/".length()) : "";

        System.out.println("Extracted object name: '" + objectName + "'");

        if (objectName.isBlank()) {
            System.err.println("ERROR: Object name is blank");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Object name is required".getBytes());
        }

        System.out.println("INFO: Fetching file: " + objectName);
        
        MinioStorageService.FileObject obj;
        try {
            obj = minioStorageService.getObject(objectName);
            System.out.println("SUCCESS: File retrieved: " + objectName);
        } catch (RuntimeException e) {
            System.err.println("ERROR: Failed to get file from MinIO: " + objectName);
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(("File not found: " + e.getMessage()).getBytes());
        }

        try (InputStream in = obj.getInputStream()) {
            byte[] bytes = in.readAllBytes();
            HttpHeaders headers = new HttpHeaders();
            String contentType = obj.getContentType();
            headers.setContentType(contentType != null
                    ? MediaType.parseMediaType(contentType)
                    : MediaType.APPLICATION_OCTET_STREAM);
            headers.setContentLength(bytes.length);
            headers.setContentDisposition(ContentDisposition.inline().build());
            
            // CORS headers for cross-origin image loading
            headers.set("Access-Control-Allow-Origin", "*");
            headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
            headers.set("Access-Control-Allow-Headers", "*");
            
            // Cache control
            headers.setCacheControl("public, max-age=31536000, immutable");
            
            System.out.println("SUCCESS: Serving file: " + objectName + " (" + bytes.length + " bytes)");
            return new ResponseEntity<>(bytes, headers, HttpStatus.OK);
        } catch (Exception e) {
            System.err.println("ERROR: Failed to read file stream: " + objectName);
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(("Error reading file: " + e.getMessage()).getBytes());
        }
    }
}
