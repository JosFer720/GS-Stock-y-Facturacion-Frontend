FROM node:lts-alpine

RUN apk add --no-cache g++ make postgresql-dev

WORKDIR /app

COPY package*.json ./
RUN npm install --production && \
    npm install bcryptjs jsonwebtoken@latest dotenv cors

COPY . .

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

EXPOSE 3000

CMD ["node", "index.js"]