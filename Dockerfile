FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:1.27-alpine

COPY deploy/nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY deploy/nginx/40-validate-backend-url.sh /docker-entrypoint.d/40-validate-backend-url.sh
COPY --from=build /app/dist/yoobu-web/browser /usr/share/nginx/html

RUN chmod +x /docker-entrypoint.d/40-validate-backend-url.sh

EXPOSE 8080

ENV PORT=8080

CMD ["nginx", "-g", "daemon off;"]
