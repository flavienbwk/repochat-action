
# Use an official Node.js runtime as the base image
FROM ubuntu:22.04

# Install dependencies
RUN apt-get update && apt-get install -y \
    curl \
    gnupg \
    build-essential \
    && curl -fsSL https://deb.nodesource.com/setup_lts.x | bash - \
    && apt-get install -y nodejs python3 python3-pip python3-dev \
    && npm install -g npm \
    && npm install -g pnpm \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

    
# Verify installations
RUN node --version && npm --version && pnpm --version

WORKDIR /usr/app

COPY package-lock.json package.json /usr/app/
RUN npm ci


# Install libmagic
RUN apt-get update && apt-get install -y libmagic1 && apt-get clean && rm -rf /var/lib/apt/lists/*

COPY ./app /usr/app/app
COPY ./api /usr/app/api
COPY .vercel.json .vercelignore next-env.d.ts next.config.js package.json postcss.config.js tailwind.config.js tsconfig.json /usr/app/

ENTRYPOINT [ "npm", "run", "fastapi-prod" ]
