# ---- Base Node Image ----
FROM node:18-alpine as base

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Build the NestJS app
RUN npm run build

# ---- Production Runner ----
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev

COPY --from=base /app/dist ./dist

EXPOSE 7000

CMD ["node", "dist/main.js"]
