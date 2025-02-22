# Stage 1: Build the React app
FROM node:18-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Serve the app with Node.js
FROM node:18-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/public ./public
COPY --from=builder /app/build ./build
COPY --from=builder /app/server.js ./
EXPOSE 3002
CMD ["node", "server.js"]
