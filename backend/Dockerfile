FROM eclipse-temurin:21-jdk AS build

WORKDIR /workspace

# The committed wrapper makes the image independent of a host Gradle install.
COPY backend/gradlew backend/build.gradle.kts backend/settings.gradle.kts ./
COPY backend/gradle ./gradle
RUN chmod +x gradlew

COPY backend/src ./src
RUN ./gradlew --no-daemon bootJar

FROM eclipse-temurin:21-jre AS runtime

WORKDIR /app

COPY --from=build /workspace/build/libs/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
