# Single-stage build for Node.js application
FROM node:18-slim
WORKDIR /app

# Install dependencies first (better layer caching)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application code
COPY . .

# Verify public directory exists and has content
RUN ls -la public/

# Create necessary directories
RUN mkdir -p images results

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3002

# Expose the port the app runs on
EXPOSE 3002

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3002/api/health || exit 1

# Command to run the application
CMD ["node", "server.js"]
