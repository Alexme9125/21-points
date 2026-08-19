FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/engine/package.json packages/engine/package.json
COPY apps/server/package.json apps/server/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm install
COPY . .
RUN npm test && npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
ENV HOST=0.0.0.0
COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/engine ./packages/engine
COPY --from=build /app/apps/server ./apps/server
COPY --from=build /app/apps/web/dist ./apps/web/dist
EXPOSE 8080
CMD ["node", "apps/server/dist/index.js"]
