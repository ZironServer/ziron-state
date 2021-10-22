FROM node:14.18.1-stretch as build
WORKDIR /usr/app/
COPY . .
RUN npm install
RUN npm run build


FROM node:14.18.1-slim
WORKDIR /usr/app

COPY package*.json ./
RUN npm ci --only=production

COPY --from=build /usr/app/dist ./dist

HEALTHCHECK --interval=15s --timeout=15s --start-period=10s \
   CMD node node_modules/ziron-server/dist/healthcheck.js d-7777

EXPOSE 7777

CMD npm run start