# ==========================================
# 1. Base Stage
# ==========================================
FROM node:20-alpine AS base
WORKDIR /app
# Install openssl for Prisma
RUN apk add --no-cache openssl
COPY package*.json ./
COPY prisma ./prisma/

# ==========================================
# 2. Development Stage
# ==========================================
FROM base AS development
# Install all dependencies (including devDependencies)
RUN npm ci
COPY . .
# Generate Prisma Client
RUN npx prisma generate
ENV NODE_ENV=development
# Run dev server with hot reload
CMD ["npm", "run", "dev"]

# ==========================================
# 3. Builder Stage (for production)
# ==========================================
FROM development AS builder
# Build the TypeScript code
RUN npm run build

# ==========================================
# 4. Production Stage
# ==========================================
FROM base AS production
ENV NODE_ENV=production
# Install only production dependencies
RUN npm ci --omit=dev && npm cache clean --force
# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
# Copy Prisma generated client
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Use a non-root user for security
USER node
EXPOSE 5000
CMD ["npm", "start"]
