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
