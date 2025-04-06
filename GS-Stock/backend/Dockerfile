FROM node:lts-alpine

RUN apk add --no-cache g++ make postgresql-dev curl

WORKDIR /app

COPY package*.json ./
RUN npm install --production && \
    npm install bcryptjs jsonwebtoken@latest dotenv cors pg

COPY . .

HEALTHCHECK --interval=10s --timeout=5s --start-period=60s --retries=5 \
    CMD curl -f http://localhost:3000/health || exit 1

EXPOSE 3000

CMD ["node", "index.js"]