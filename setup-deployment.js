#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Create .env.example for reference
const envExample = `# Database
DATABASE_URL="file:./dev.db"

# JWT
JWT_SECRET="your-secret-key-here"

# Server
PORT=4000
NODE_ENV=production

# Frontend URL (for CORS)
FRONTEND_URL="https://your-frontend-domain.vercel.app"
`;

fs.writeFileSync(path.join(__dirname, 'backend/.env.example'), envExample);
console.log('✓ Created backend/.env.example');
