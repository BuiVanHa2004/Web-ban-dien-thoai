package com.webbanhang.shop.Exception;

import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;

@ControllerAdvice
public class GlobalExceptionHandler {

    // Handle ResponseStatusException (409 CONFLICT, 400 BAD_REQUEST, etc.)
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, Object>> handleResponseStatusException(ResponseStatusException ex) {
        Map<String, Object> body = new HashMap<>();
        body.put("status", ex.getStatusCode().value());
        body.put("error", ex.getStatusCode().toString());
        body.put("message", ex.getReason() != null ? ex.getReason() : "An error occurred");
        return ResponseEntity.status(ex.getStatusCode()).body(body);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidationErrors(MethodArgumentNotValidException ex) {
        Map<String, Object> body = new HashMap<>();
        body.put("status", 400);
        body.put("error", "Validation Failed");
        
        // Lấy tất cả lỗi validation
        String errorMessage = ex.getBindingResult()
                .getFieldErrors()
                .stream()
                .map(FieldError::getDefaultMessage)
                .collect(Collectors.joining(", "));
        
        body.put("message", errorMessage.isEmpty() ? "Dữ liệu không hợp lệ" : errorMessage);
        
        // Thêm chi tiết lỗi từng field (optional)
        Map<String, String> fieldErrors = ex.getBindingResult()
                .getFieldErrors()
                .stream()
                .collect(Collectors.toMap(
                    FieldError::getField,
                    error -> error.getDefaultMessage() != null ? error.getDefaultMessage() : "Invalid value",
                    (existing, replacement) -> existing
                ));
        
        if (!fieldErrors.isEmpty()) {
            body.put("fieldErrors", fieldErrors);
        }
        
        return ResponseEntity.status(400).body(body);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalArgument(IllegalArgumentException e) {
        Map<String, Object> body = new HashMap<>();
        body.put("status", 400);
        body.put("error", "Bad Request");
        body.put("message", e.getMessage());
        return ResponseEntity.status(400).body(body);
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalState(IllegalStateException e) {
        Map<String, Object> body = new HashMap<>();
        body.put("status", 400);
        body.put("error", "Conflict/State Error");
        body.put("message", e.getMessage());
        return ResponseEntity.status(400).body(body);
    }

    @ExceptionHandler(NotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleNotFound(NotFoundException e) {
        Map<String, Object> body = new HashMap<>();
        body.put("status", 404);
        body.put("error", "Not Found");
        body.put("message", e.getMessage());
        return ResponseEntity.status(404).body(body);
    }

    @ExceptionHandler(BadRequestException.class)
    public ResponseEntity<Map<String, Object>> handleBadRequest(BadRequestException e) {
        Map<String, Object> body = new HashMap<>();
        body.put("status", 400);
        body.put("error", "Bad Request");
        body.put("message", e.getMessage());
        return ResponseEntity.status(400).body(body);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGeneral(Exception e) {
        e.printStackTrace();
        Map<String, Object> body = new HashMap<>();
        body.put("status", 500);
        body.put("error", "Internal Server Error");
        body.put("message", e.getMessage());
        return ResponseEntity.status(500).body(body);
    }
}
