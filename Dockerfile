FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
ARG CACHEBUST=1
COPY . .
EXPOSE 3001
CMD ["node", "server.js"]
