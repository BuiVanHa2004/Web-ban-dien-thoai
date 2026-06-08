# =============================================
# Stage 1: Build - Maven + Java 17
# =============================================
FROM eclipse-temurin:17-jdk-alpine AS builder

WORKDIR /app

# Copy Maven wrapper và pom.xml trước (tận dụng Docker layer cache)
COPY mvnw mvnw.cmd ./
COPY .mvn .mvn
COPY pom.xml ./

# Download dependencies (cached nếu pom.xml không thay đổi)
RUN chmod +x mvnw && ./mvnw dependency:go-offline -B

# Copy source code
COPY src ./src

# Build - bỏ qua tests để build nhanh hơn
RUN ./mvnw clean package -DskipTests -B

# =============================================
# Stage 2: Runtime - JRE nhỏ gọn
# =============================================
FROM eclipse-temurin:17-jre-alpine AS runtime

# Tạo user non-root cho bảo mật
RUN addgroup -S spring && adduser -S spring -G spring

WORKDIR /app

# Copy JAR từ stage build
COPY --from=builder /app/target/*.jar app.jar

# Đổi owner
RUN chown spring:spring app.jar

USER spring

# Render.com dùng PORT env var
EXPOSE 8080

# JVM tuning cho container nhỏ (512MB RAM của Render free tier)
ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=60.0 -XX:InitialRAMPercentage=30.0 -XX:+UseG1GC -XX:MaxGCPauseMillis=200 -XX:G1HeapRegionSize=4m -Djava.security.egd=file:/dev/./urandom -Dspring.backgroundpreinitializer.ignore=true"

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
