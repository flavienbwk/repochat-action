from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from api.help_desk import HelpDesk
import nltk
from fastapi.middleware.cors import CORSMiddleware

from api.config import FORCE_EMBEDDINGS_DB_RELOAD, REPO_NAME, REPO_URL

app = FastAPI(title=f"Repo {REPO_NAME}")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class Query(BaseModel):
    prompt: str

def get_model():
    nltk.download("punkt")
    model = HelpDesk(new_db=FORCE_EMBEDDINGS_DB_RELOAD)
    return model

model = get_model()

@app.get("/")
async def root():
    return { "message": "alive" }

@app.get("/api/settings")
async def root():
    return {
        "repo_name": REPO_NAME,
        "repo_url": REPO_URL,
        "message": f"Welcome to the {REPO_NAME} chatbot API. Use the /query endpoint to ask questions.",
        "warning_message": "This search engine may produce inaccurate explanations (called hallucinations), please verify the sources."
    }

@app.post("/api/query")
async def query(query: Query):
    try:
        result, sources = model.retrieval_qa_inference(query.prompt, verbose=False)
        return {
            "result": result,
            "sources": sources
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5328)
