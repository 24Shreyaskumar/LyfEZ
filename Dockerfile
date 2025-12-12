# Root Dockerfile to build and run backend service
FROM node:18-alpine

WORKDIR /app

# Install backend dependencies
COPY backend/package*.json ./backend/
RUN cd backend && npm install

# Copy backend source
COPY backend ./backend
WORKDIR /app/backend

# Generate Prisma client
RUN npx prisma generate

EXPOSE 4000
CMD ["npm", "start"]
