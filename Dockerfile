# -----------------------------
# 1) BUILD STAGE
# -----------------------------
FROM node:18 AS builder

WORKDIR /app

# Copy over package files first (better caching)
COPY package*.json ./

# Install all dependencies (including dev)
RUN npm ci

# Now copy the rest of the code
COPY . .

# Build the React app
RUN npm run build


# -----------------------------
# 2) RUN STAGE
# -----------------------------
FROM node:18

WORKDIR /app

# Copy only production dependencies
COPY package*.json ./
RUN npm ci --production

# Copy the compiled React build from stage 1
COPY --from=builder /app/build ./build
COPY --from=builder /app/public ./public
# Copy the server file
COPY server.js ./

# Expose port 8080 (commonly used by Node & Cloud Run)
EXPOSE 8080

# Define startup command
CMD ["node", "--enable-source-maps", "server.js"]
