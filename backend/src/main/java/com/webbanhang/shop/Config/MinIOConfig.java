package com.webbanhang.shop.Config;

import io.minio.MinioClient;
import lombok.Getter;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.util.StringUtils;

@Configuration
@ConditionalOnExpression("T(org.springframework.util.StringUtils).hasText('${minio.endpoint:}')")
@Getter
public class MinIOConfig {

    @Value("${minio.endpoint}")
    private String endpoint;

    @Value("${minio.access-key}")
    private String accessKey;

    @Value("${minio.secret-key}")
    private String secretKey;

    @Value("${minio.bucket-name}")
    private String bucketName;

    @Value("${minio.url-prefix}")
    private String urlPrefix;

    @Value("${minio.region:}")
    private String region;

    @Bean
    public MinioClient minioClient() {
        MinioClient.Builder builder = MinioClient.builder()
                .endpoint(endpoint)
                .credentials(accessKey, secretKey);
        if (StringUtils.hasText(region)) {
            builder.region(region);
        }
        return builder.build();
    }
}

