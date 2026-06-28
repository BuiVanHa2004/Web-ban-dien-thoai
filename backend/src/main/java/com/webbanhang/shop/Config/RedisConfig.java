package com.webbanhang.shop.Config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.connection.RedisStandaloneConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceClientConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;
import org.springframework.data.redis.serializer.StringRedisSerializer;

import io.lettuce.core.ClientOptions;
import io.lettuce.core.SocketOptions;

import java.time.Duration;

@Configuration
@EnableCaching
public class RedisConfig {

    @Value("${spring.data.redis.host:localhost}")
    private String redisHost;

    @Value("${spring.data.redis.port:6379}")
    private int redisPort;

    @Value("${spring.data.redis.password:}")
    private String redisPassword;

    @Value("${spring.data.redis.ssl.enabled:false}")
    private boolean sslEnabled;

    @Value("${spring.data.redis.timeout:2000}")
    private long timeout;

    @Bean
    public RedisConnectionFactory redisConnectionFactory() {
        RedisStandaloneConfiguration redisConfig = new RedisStandaloneConfiguration();
        redisConfig.setHostName(redisHost);
        redisConfig.setPort(redisPort);
        
        if (redisPassword != null && !redisPassword.isEmpty()) {
            redisConfig.setPassword(redisPassword);
        }

        // Cấu hình Lettuce Client
        LettuceClientConfiguration.LettuceClientConfigurationBuilder clientConfigBuilder = 
            LettuceClientConfiguration.builder()
                .commandTimeout(Duration.ofMillis(timeout));

        // Bật SSL nếu cần (cho Upstash)
        if (sslEnabled) {
            clientConfigBuilder.useSsl();
        }

        // Cấu hình socket timeout và connection timeout
        ClientOptions clientOptions = ClientOptions.builder()
            .socketOptions(SocketOptions.builder()
                .connectTimeout(Duration.ofMillis(timeout))
                .build())
            .build();
        
        clientConfigBuilder.clientOptions(clientOptions);

        LettuceConnectionFactory factory = new LettuceConnectionFactory(
            redisConfig, 
            clientConfigBuilder.build()
        );
        
        return factory;
    }

    @Bean
    public RedisTemplate<String, Object> redisTemplate(RedisConnectionFactory connectionFactory) {
        RedisTemplate<String, Object> template = new RedisTemplate<>();
        template.setConnectionFactory(connectionFactory);
        
        // Sử dụng StringRedisSerializer cho key
        StringRedisSerializer stringSerializer = new StringRedisSerializer();
        template.setKeySerializer(stringSerializer);
        template.setHashKeySerializer(stringSerializer);
        
        // Sử dụng GenericJackson2JsonRedisSerializer cho value
        GenericJackson2JsonRedisSerializer jsonSerializer = new GenericJackson2JsonRedisSerializer();
        template.setValueSerializer(jsonSerializer);
        template.setHashValueSerializer(jsonSerializer);
        
        template.afterPropertiesSet();
        return template;
    }

    @Bean
    public CacheManager cacheManager(RedisConnectionFactory connectionFactory) {
        // Cấu hình cache mặc định
        RedisCacheConfiguration defaultConfig = RedisCacheConfiguration.defaultCacheConfig()
            .entryTtl(Duration.ofHours(1)) // Cache 1 giờ mặc định
            .serializeKeysWith(
                RedisSerializationContext.SerializationPair.fromSerializer(new StringRedisSerializer())
            )
            .serializeValuesWith(
                RedisSerializationContext.SerializationPair.fromSerializer(new GenericJackson2JsonRedisSerializer())
            )
            .disableCachingNullValues(); // Không cache giá trị null

        // Cấu hình cache riêng cho từng loại
        return RedisCacheManager.builder(connectionFactory)
            .cacheDefaults(defaultConfig)
            // Products - cache 2 giờ (ít thay đổi)
            .withCacheConfiguration("products", 
                defaultConfig.entryTtl(Duration.ofHours(2)))
            // Product details - cache 2 giờ
            .withCacheConfiguration("productDetails", 
                defaultConfig.entryTtl(Duration.ofHours(2)))
            // Categories - cache 4 giờ (rất ít thay đổi)
            .withCacheConfiguration("categories", 
                defaultConfig.entryTtl(Duration.ofHours(4)))
            // Brands - cache 4 giờ
            .withCacheConfiguration("brands", 
                defaultConfig.entryTtl(Duration.ofHours(4)))
            // Banners - cache 1 giờ
            .withCacheConfiguration("banners", 
                defaultConfig.entryTtl(Duration.ofHours(1)))
            // News - cache 30 phút
            .withCacheConfiguration("news", 
                defaultConfig.entryTtl(Duration.ofMinutes(30)))
            // Cart - cache 5 phút (thay đổi thường xuyên)
            .withCacheConfiguration("carts", 
                defaultConfig.entryTtl(Duration.ofMinutes(5)))
            // Orders - cache 10 phút
            .withCacheConfiguration("orders", 
                defaultConfig.entryTtl(Duration.ofMinutes(10)))
            .build();
    }
}
