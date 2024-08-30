# Repochat Action

Chat with your repo in under 2 minutes using GitHub Actions on supported Cloud providers.

Repochat is a LLM chatbot with stateless data ingestion capabilities through its API.

## Requirements

- A [supported cloud provider](#supported-cloud-providers) API key ;
- An [OpenAI](https://openai.com/api/) API key.

## Supported Cloud providers

- Scaleway / `cloud_provider: 'scaleway'`.

## Usage for GitHub Actions

```yaml
jobs:
    steps:
    - name: Deploy a convenient chatbot for your repo
        id: deploy_repochat
        uses: flavienbwk/repochat-action@v1
        if: github.ref == 'refs/heads/main'
        with:
            dirs_to_scan: "./example,README.md" # comma-separated glob dirs to analyze from this repo
            openai_api_key: ${{ secrets.OPENAI_API_KEY }}
            openai_model_type_inference: "gpt-4o-mini"
            openai_model_type_embedding : "text-embedding-3-small"
            cloud_provider: 'scaleway'
            api_key_id: ${{ secrets.API_KEY_ID }}
            api_key_secret: ${{ secrets.API_KEY_SECRET }}

    - name: Get container domain from precedent step
        run: echo "DOMAIN=${{ steps.deploy_repochat.outputs.domain }}" >> $GITHUB_OUTPUT
        id: get_container_domain
```

## Usage for local directory

1. Copy repo/documents/files to be ingested under `./api/example/`

2. Copy and update env variables

    ```bash
    cp .env.example .env
    ```

3. Run the Docker container

    ```bash
    docker compose -f dir.docker-compose.yml up -d
    ```

4. Access the app at `http://localhost:3001`

## Why not use Vercel ?

Vercel is very limited when deploying everything but JS. First, ChromaDB (and any sqlite-based library) [is not supported in Vercel](https://vercel.community/t/is-vercel-incompatible-with-chromadb-sqlite/787). Then, this project uses a FastAPI Python API that requires more storage than [Vercel's 250MB bundle limit](https://vercel.com/docs/functions/runtimes#bundle-size-limits).
