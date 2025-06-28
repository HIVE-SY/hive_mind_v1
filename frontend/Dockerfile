# Build stage
FROM node:20-alpine AS build

WORKDIR /app

# Copy package files first
COPY package*.json ./
RUN npm ci

# Copy everything else (after .dockerignore has excluded junk)
COPY . .

# Set build-time environment variable
ARG VITE_API_BASE_URL
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

RUN echo "VITE_API_BASE_URL=$VITE_API_BASE_URL" > .env.production \
    && echo "VITE_SUPABASE_URL=$VITE_SUPABASE_URL" >> .env.production \
    && echo "VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY" >> .env.production
    RUN cat .env.production
# Build the app
RUN npm run build

# Production stage
FROM nginx:stable-alpine

# Copy custom nginx config (make sure it exists)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built files from previous stage
COPY --from=build /app/dist /usr/share/nginx/html

# Security
RUN adduser -D -H -u 101 -s /sbin/nologin nginx || true

# Permissions
RUN chown -R nginx:nginx /usr/share/nginx/html

# USER nginx
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
