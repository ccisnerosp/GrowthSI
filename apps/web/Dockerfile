# Next.js web (Frontend + API transaccional + proxy hacia el AI service)
# Este Dockerfile se mueve a apps/web/Dockerfile cuando se reestructure el monorepo.
FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
WORKDIR /app

# ── deps ──
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

# ── build ──
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npm run build

# ── runtime ──
FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/prisma ./prisma
EXPOSE 3000
CMD ["npm", "run", "start"]
