FROM gradle:8.10-jdk21-alpine AS builder
WORKDIR /app
COPY apps/api-java/ ./apps/api-java/
RUN gradle -p apps/api-java :build --no-daemon -x test

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=builder /app/apps/api-java/build/libs/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
