FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=development

# Copy package definitions and workspace folders first to install deps (cached when unchanged)
COPY package.json package-lock.json* ./
COPY apps ./apps
COPY packages ./packages

# Install dependencies
RUN npm install

EXPOSE 3000 3001

# Default to an idle command; docker-compose will run the actual dev commands per-service
CMD ["tail", "-f", "/dev/null"]
