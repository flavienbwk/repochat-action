# Repochat Action

> [!CAUTION]
> This project is currently NOT ready.
> This project is in early development and may contain bugs or incomplete features. Use with caution in production environments.

Chat with your repo in under 2 minutes using GitHub Actions on supported Cloud providers.

Repochat is a LLM chatbot with stateless data ingestion capabilities through its API.

## Requirements

- A [supported cloud provider](#supported-cloud-providers) credentials ;
- An [OpenAI](https://openai.com/api/) API key.

## Usage for GitHub Actions

```yaml
jobs:
    steps:
    - name: Deploy a convenient chatbot for your repo
      id: deploy_repochat
      uses: flavienbwk/repochat-action@v0
      if: github.ref == 'refs/heads/main'
      with:
        dirs_to_scan: "./example,README.md" # comma-separated glob dirs to analyze from this repo
        openai_api_key: ${{ secrets.OPENAI_API_KEY }}
        openai_model_type_inference: "gpt-4o-mini"
        openai_model_type_embedding : "text-embedding-3-small"
        cloud_provider: 'scaleway'
        provider_key_id: ${{ secrets.PROVIDER_KEY_ID }}
        provider_key_secret: ${{ secrets.PROVIDER_KEY_SECRET }}
        provider_project_id: ${{ secrets.PROVIDER_PROJECT_ID }}
        provider_default_region: 'fr-par'
        provider_default_zone: 'fr-par-2'

    - name: Get container domain from precedent step
      run: echo "DOMAIN=${{ steps.deploy_repochat.outputs.domain }}" >> $GITHUB_OUTPUT
      id: repochat_domain
```

### Supported Cloud providers

- **[Scaleway](https://www.scaleway.com/en/)**
  - Refer to [Scaleway's documentation to generate API keys](https://www.scaleway.com/en/docs/identity-and-access-management/iam/how-to/create-api-keys/).
  - Required parameters:
    - `cloud_provider`: 'scaleway'
    - `provider_key_id`: ${{ secrets.PROVIDER_KEY_ID }}
    - `provider_key_secret`: ${{ secrets.PROVIDER_KEY_SECRET }}
    - `provider_project_id`: ${{ secrets.PROVIDER_PROJECT_ID }}
    - `provider_default_region`: 'fr-par'  # example
    - `provider_default_zone`: 'fr-par-2'  # example

## Other deployments

### Deploy for local directory

<details>
<summary>👉 Deploy locally for directory serving...</summary>

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

</details>

### Deploy as stateless API

<details>
<summary>👉 Deploy locally as a stateless API...</summary>

1. Copy and update env variables

    ```bash
    cp .env.example .env
    ```

2. Run the Docker container

    ```bash
    docker compose -f api.docker-compose.yml up -d
    ```

3. Inject data taking example on the [Python](./scripts/ingest-docs-api.py) or [JS](./scripts/ingest-docs-api.js) scripts

4. Access the app at `http://localhost:3001`

</details>

## Development

```bash
make dev
```

## Release Action

1. Increase repochat's version in `./package.json`

2. Run build and commit latest edits:

    ```bash
    npm run build
    # git add && git commit && git push...
    ```

3. Merge on `main`

    This will create a release based on `package.json` and push the `:latest` Docker image.

## Why not use Vercel ?

Vercel is very limited when deploying everything but JS. First, ChromaDB (and any sqlite-based library) [is not supported in Vercel](https://vercel.community/t/is-vercel-incompatible-with-chromadb-sqlite/787). Then, this project uses a FastAPI Python API that requires more storage than [Vercel's 250MB bundle limit](https://vercel.com/docs/functions/runtimes#bundle-size-limits).
