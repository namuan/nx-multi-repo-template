# Build stage
FROM node:22-alpine AS builder
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy workspace manifests
COPY package.json pnpm-workspace.yaml ./
COPY apps/frontend/package.json ./apps/frontend/
COPY libs/ui-shared/package.json ./libs/ui-shared/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source files
COPY tsconfig.base.json nx.json ./
COPY apps/frontend/ ./apps/frontend/
COPY libs/ui-shared/ ./libs/ui-shared/

# Build
RUN pnpm exec nx build frontend --configuration=production

# Production stage
FROM nginx:alpine
COPY --from=builder /app/dist/apps/frontend /usr/share/nginx/html
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
