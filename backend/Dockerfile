# Image de production du service backend
FROM node:20-alpine
ENV NODE_ENV=production
WORKDIR /app

# Dépendances de production uniquement, versions figées par package-lock.json
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY . .
# Dossier de logs Winston accessible à l'utilisateur non-root
RUN mkdir -p logs && chown node:node logs
USER node

EXPOSE 5000
# Sonde sur /health (PORT peut être redéfini, ex. par Render)
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:${PORT:-5000}/health || exit 1

CMD ["node", "server.js"]
