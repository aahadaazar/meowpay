// Assumes the stack from docker-compose.yml (or `npm run dev` + `./gradlew bootRun`) is
// already running — this suite does not boot it. Override via env vars if ports differ.
export const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
export const backendURL = process.env.E2E_BACKEND_URL ?? "http://localhost:8080";
