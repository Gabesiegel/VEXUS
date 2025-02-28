# Single-stage build for Node.js application
FROM node:18-slim
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application code
COPY . .

# Expose the port the app runs on
EXPOSE 3003

# Command to run the application
CMD ["node", "server.js"]
