# Multi-stage build for Buderus Dashboard

# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build

# Stage 2: Build Backend
FROM node:20-alpine AS backend-builder
WORKDIR /app/backend

COPY backend/package*.json ./
RUN npm install --production

COPY backend/ ./

# Stage 3: Final Runtime
FROM node:20-alpine
WORKDIR /app

# Install production dependencies for backend
COPY --from=backend-builder /app/backend /app

# Copy built frontend files
COPY --from=frontend-builder /app/frontend/dist /app/public

# Create data directory for SQLite
RUN mkdir -p /app/data

# Expose port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Start the server
CMD ["node", "server.js"]
