FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm install

# Copy source
COPY prisma ./prisma
COPY src ./src
COPY .env.example ./

# Generate Prisma client
RUN npx prisma generate

EXPOSE 4000

CMD ["npm", "start"]
