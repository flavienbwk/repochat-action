
# All-in-one container for Repochat
FROM ubuntu:22.04

ARG NODE_ENV production

RUN apt-get update && apt-get install -y \
    curl \
    gnupg \
    build-essential libmagic1 \
    && curl -fsSL https://deb.nodesource.com/setup_lts.x | bash - \
    && apt-get install -y nginx nodejs python3 python3-pip \
    && npm install -g npm pnpm \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

    
# Verify installations
RUN node --version && npm --version && pnpm --version

WORKDIR /usr/app

COPY package-lock.json package.json /usr/app/
RUN npm ci

COPY ./requirements.txt /usr/app/
RUN python3 -m pip install -r /usr/app/requirements.txt --no-cache-dir

COPY ./app /usr/app/app
COPY ./api /usr/app/api
COPY next-env.d.ts next.config.js package.json postcss.config.js tailwind.config.js tsconfig.json /usr/app/

RUN pnpm exec next telemetry disable
RUN pnpm run build

# NGINX configuration for a single endpoint
RUN echo "events { worker_connections 1024; }" > /etc/nginx/nginx.conf && \
    echo "http {" >> /etc/nginx/nginx.conf && \
    echo "    server {" >> /etc/nginx/nginx.conf && \
    echo "        listen 80;" >> /etc/nginx/nginx.conf && \
    echo "        location / {" >> /etc/nginx/nginx.conf && \
    echo "            proxy_pass http://127.0.0.1:3000;" >> /etc/nginx/nginx.conf && \
    echo "        }" >> /etc/nginx/nginx.conf && \
    echo "        location /api {" >> /etc/nginx/nginx.conf && \
    echo "            proxy_pass http://127.0.0.1:5328;" >> /etc/nginx/nginx.conf && \
    echo "        }" >> /etc/nginx/nginx.conf && \
    echo "    }" >> /etc/nginx/nginx.conf && \
    echo "}" >> /etc/nginx/nginx.conf


ENTRYPOINT [ "sh", "-c", "service nginx start && pnpm concurrently \"pnpm run start\" \"pnpm run fastapi-prod\"" ]
