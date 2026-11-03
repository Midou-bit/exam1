# Étape 1 : build de l'application React (CRA)
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
# Dépendances de dev nécessaires au build (react-scripts, tailwind)
RUN npm ci
COPY . .
# L'URL de l'API est figée dans le bundle au moment du build
ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=$REACT_APP_API_URL
RUN npm run build

# Étape 2 : service des fichiers statiques par nginx
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
CMD ["nginx", "-g", "daemon off;"]
