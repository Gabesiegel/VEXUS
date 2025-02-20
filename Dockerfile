# -----------------------------
# 1) BUILD STAGE
# -----------------------------
FROM node:18-slim AS builder

WORKDIR /app

# Copy package files first (better caching)
COPY package*.json ./

# Install all dependencies (including dev)
RUN npm ci

# Copy the entire project
COPY . .

# Build the React app
RUN npm run build

# -----------------------------
# 2) RUN STAGE
# -----------------------------
FROM node:18-slim

WORKDIR /app

# Copy only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy the public directory from builder
COPY --from=builder /app/public ./public

# Copy the build directory (React build)
COPY --from=builder /app/build ./build

# Copy server.js
COPY --from=builder /app/server.js ./

EXPOSE 8080

CMD ["node", "server.js"]
