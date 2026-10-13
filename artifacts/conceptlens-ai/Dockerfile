FROM node:22

RUN corepack enable
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY artifacts/conceptlens-ai/package.json ./artifacts/conceptlens-ai/package.json

RUN pnpm config set dangerouslyAllowAllBuilds true
RUN pnpm install --filter "./artifacts/conceptlens-ai..." --frozen-lockfile

COPY lib ./lib
COPY artifacts/conceptlens-ai ./artifacts/conceptlens-ai

EXPOSE 5173

CMD ["pnpm", "--filter", "./artifacts/conceptlens-ai", "run", "dev", "--", "--host", "0.0.0.0"]