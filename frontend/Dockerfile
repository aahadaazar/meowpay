FROM node:22-alpine AS development

WORKDIR /workspace

ENV NEXT_TELEMETRY_DISABLED=1

# Keep dependency installation in its own layer so source-only changes reuse it.
COPY package.json ./
RUN npm install --no-audit --no-fund \
    && mkdir -p /opt/meowpay \
    && sha256sum package.json > /opt/meowpay/package.sha256 \
    && mv node_modules /opt/meowpay/node_modules

COPY docker-entrypoint.sh /usr/local/bin/meowpay-frontend
RUN chmod +x /usr/local/bin/meowpay-frontend

COPY . ./

EXPOSE 3000

ENTRYPOINT ["/usr/local/bin/meowpay-frontend"]
CMD ["npm", "run", "dev", "--", "--hostname", "0.0.0.0"]
