FROM node:lts-alpine

RUN apk add --no-cache g++ make python3 postgresql-dev curl

WORKDIR /app

COPY package*.json ./

# Instalar todas las dependencias de una sola vez
RUN npm install --include=dev

COPY . .

HEALTHCHECK --interval=10s --timeout=5s --start-period=60s --retries=5 \
    CMD curl -f http://localhost:3000/health || exit 1

EXPOSE 3000

CMD ["node", "index.js"]