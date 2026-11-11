# Imagen de la UI del predictor. Repo self-contained: el contexto de build es ESTE repo.
#   docker build -t predictor-ui .
#
# Sirve la SPA (Vite) con Nginx. Los JSON de datos (backtest/signals/portfolio/live)
# NO se hornean: se sirven desde un VOLUMEN compartido con el worker, montado en
# /usr/share/nginx/html/data en runtime (ver docker-compose del predictor-deploy).

FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
# La UI lee los JSON reales desde /data/buy_the_dip (servidos por nginx desde el volumen).
# Estos valores se HORNEAN en el bundle de Vite (no son runtime).
ENV VITE_BUY_DIP_DATA_MODE=json
ENV VITE_BUY_DIP_DATA_BASE_URL=/data/buy_the_dip
RUN pnpm build

# La imagen final solo sirve los estáticos compilados con Nginx.
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
