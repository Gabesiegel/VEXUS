# -----------------------------
# 1) BUILD STAGE
# -----------------------------
FROM node:18 AS builder

# Create a directory for your application
WORKDIR /app

# Copy package files first (better caching)
COPY package*.json ./

# Install dependencies (development + production)
RUN npm ci

# Now copy all your source code into the container
COPY . .

# Build your React app for production
RUN npm run build


# -----------------------------
# 2) RUN STAGE
# -----------------------------
FROM node:18

# Create a directory for the final container
WORKDIR /app

# Copy only the necessary files for production
COPY package*.json ./
# Install only production dependencies in the final image
RUN npm ci --production

# Copy the built React files from the builder stage
COPY --from=builder /app/build ./build

# Copy your server file (server.js) if it isn't already included
COPY server.js ./

# Expose the container's port (for Cloud Run, not strictly required, but good for local testing)
EXPOSE 8080

# Define the command to start your Node server
CMD ["npm", "start"]
