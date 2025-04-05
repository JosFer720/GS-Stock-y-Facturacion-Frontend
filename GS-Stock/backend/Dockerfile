FROM node:lts-alpine

RUN apk add --no-cache python3 g++ make postgresql-dev

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
CMD node -e "require('pg').Client(process.env.DATABASE_URL || 'postgres://postgres:postgres@postgres:5432/postgres').connect(() => process.exit(0))"

EXPOSE 3000
CMD ["npm", "start"]