FROM node:19-alpine

WORKDIR /app
COPY . .
RUN npm install --development --force
RUN npm run build
CMD ["node", "/app/dist/src/index.js"]
