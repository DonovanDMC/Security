FROM node:19-alpine

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install --development --force
COPY . .
RUN npm run build
CMD ["node", "/app/dist/index.js"]
