package com.webbanhang.shop.Controller.Test;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/test/redis")
public class RedisTestController {

    @Autowired
    private RedisTemplate<String, Object> redisTemplate;

    @GetMapping("/ping")
    public ResponseEntity<?> ping() {
        Map<String, Object> response = new HashMap<>();
        try {
            // Test connection
            String pong = redisTemplate.getConnectionFactory()
                .getConnection()
                .ping();
            
            response.put("status", "success");
            response.put("message", "Redis connected successfully");
            response.put("ping", pong);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("status", "error");
            response.put("message", "Redis connection failed: " + e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
    }

    @PostMapping("/set")
    public ResponseEntity<?> setValue(@RequestParam String key, @RequestParam String value) {
        Map<String, Object> response = new HashMap<>();
        try {
            redisTemplate.opsForValue().set(key, value);
            response.put("status", "success");
            response.put("message", "Value set successfully");
            response.put("key", key);
            response.put("value", value);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("status", "error");
            response.put("message", e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
    }

    @GetMapping("/get")
    public ResponseEntity<?> getValue(@RequestParam String key) {
        Map<String, Object> response = new HashMap<>();
        try {
            Object value = redisTemplate.opsForValue().get(key);
            response.put("status", "success");
            response.put("key", key);
            response.put("value", value);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("status", "error");
            response.put("message", e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
    }
}
