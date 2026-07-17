FROM eclipse-temurin:21-jdk AS development

RUN apt-get update \
    && apt-get install -y --no-install-recommends postgresql-client \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace

ENV GRADLE_USER_HOME=/tmp/meowpay-gradle-home

# Prime the Gradle wrapper and dependency cache in a stable layer.
COPY backend/gradlew backend/build.gradle.kts backend/settings.gradle.kts ./
COPY backend/gradle ./gradle
RUN chmod +x gradlew \
    && ./gradlew --no-daemon dependencies --configuration runtimeClasspath \
    && ./gradlew --no-daemon dependencies --configuration testRuntimeClasspath \
    && mkdir -p /opt/meowpay \
    && cp -a "$GRADLE_USER_HOME"/. /opt/meowpay/gradle-home/

COPY backend/docker-entrypoint.sh /usr/local/bin/meowpay-backend
RUN chmod +x /usr/local/bin/meowpay-backend

COPY backend/src ./src
COPY supabase/migrations /opt/meowpay/migrations

EXPOSE 8080

ENTRYPOINT ["/usr/local/bin/meowpay-backend"]
CMD ["./gradlew", "--no-daemon", "bootRun"]
