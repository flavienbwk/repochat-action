# Repochat Action

Chat with your repo with one GitHub action in under 2 minutes.

## Requirements

- A Vercel account ;
- An OpenAI API key.

## Usage

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
            vercel_id: ${{ secrets.VERCEL_ID }}
            vercel_key: ${{ secrets.VERCEL_KEY }}

    - name: Get Vercel domain from precedent step
        run: echo "DOMAIN=${{ steps.deploy_repochat.outputs.domain }}" >> $GITHUB_OUTPUT
        id: get_vercel_domain
```

## Why not use Vercel

Vercel seem very limited when it is not about JS. This project uses a FastAPI Python API that requires at least 400MB of RAM when installing its dependencies. This exceeds Vercel's 250MB serverless function limit from AWS.

## Manual Vercel commands

```bash
vercel login

cp ./app/.env.example ./app/.env
grep -v '^#' ./app/.env | sed 's/^\([^=]*\)=\(.*\)$/echo "\2" | vercel env add \1 production --force /' | xargs -I {} sh -c '{}'
grep -v '^#' ./app/.env | sed 's/^\([^=]*\)=\(.*\)$/echo "\2" | vercel env add \1 development --force /' | xargs -I {} sh -c '{}'

vercel deploy 2>&1 | grep -o 'https://[a-zA-Z0-9.-]*\.vercel\.app' | head -n 1
```
