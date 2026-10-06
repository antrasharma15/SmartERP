# ---- KEYbooks backend (Express API) ----
FROM node:22-alpine

ENV NODE_ENV=production
WORKDIR /app

# Install dependencies first so Docker caches this layer until package files change.
COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

# Run as the non-root "node" user that ships with the image.
USER node

EXPOSE 5000
CMD ["node", "server.js"]
