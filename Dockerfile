
# All-in-one container for Repochat
FROM ubuntu:22.04

ARG NODE_ENV production

RUN apt-get update && apt-get install -y \
    curl gnupg build-essential libmagic1 \
    && curl -fsSL https://deb.nodesource.com/setup_lts.x | bash - \
    && apt-get install -y nginx nodejs python3 python3-pip \
    && npm install -g npm pnpm \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Verify installations
RUN node --version && npm --version && pnpm --version

RUN mkdir -p /usr/app/api
RUN mkdir -p /usr/app/app
WORKDIR /usr/app

# Installing action utils dependencies
COPY package-lock.json package.json /usr/app/
RUN npm i -g concurrently@8.2.2 && npm ci

# Installing app dependencies
COPY ./app/package-lock.json ./app/package.json /usr/app/app/
RUN cd /usr/app/app && npm ci

# Installing api dependencies
COPY ./api/requirements.txt /usr/app/api
RUN python3 -m pip install -r /usr/app/api/requirements.txt --no-cache-dir

COPY ./app /usr/app/app
COPY ./api /usr/app/api
COPY ./app/next-env.d.ts ./app/next.config.js ./app/package.json ./app/postcss.config.js ./app/tailwind.config.js ./app/tsconfig.json /usr/app/

RUN cd ./app && pnpm exec next telemetry disable && pnpm run build

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

COPY ./Makefile /usr/app/Makefile
ENTRYPOINT [ "sh", "-c", "service nginx start && make prod-docker" ]
