FROM eclipse-temurin:21-jdk AS development

WORKDIR /workspace

ENV GRADLE_USER_HOME=/tmp/meowpay-gradle-home

# Prime the Gradle wrapper and dependency cache in a stable layer.
COPY gradlew build.gradle.kts settings.gradle.kts ./
COPY gradle ./gradle
RUN chmod +x gradlew \
    && ./gradlew --no-daemon dependencies --configuration runtimeClasspath \
    && ./gradlew --no-daemon dependencies --configuration testRuntimeClasspath \
    && mkdir -p /opt/meowpay \
    && cp -a "$GRADLE_USER_HOME"/. /opt/meowpay/gradle-home/

COPY docker-entrypoint.sh /usr/local/bin/meowpay-backend
RUN chmod +x /usr/local/bin/meowpay-backend

COPY src ./src

EXPOSE 8080

ENTRYPOINT ["/usr/local/bin/meowpay-backend"]
CMD ["./gradlew", "--no-daemon", "bootRun"]
