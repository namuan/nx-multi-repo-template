FROM maven:3.9.9-eclipse-temurin-21-alpine AS builder
WORKDIR /app
COPY apps/api-java/pom.xml ./apps/api-java/pom.xml
RUN mvn -f apps/api-java/pom.xml -DskipTests dependency:go-offline
COPY apps/api-java/src/ ./apps/api-java/src/
RUN mvn -f apps/api-java/pom.xml -DskipTests package

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=builder /app/apps/api-java/target/api-java-*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
