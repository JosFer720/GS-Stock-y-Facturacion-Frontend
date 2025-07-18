FROM node:lts-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install && npm install -D vitest @vue/test-utils jsdom

COPY . .

EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host"]
