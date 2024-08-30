from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from api.dir_loader import DirLoader
from fastapi.middleware.cors import CORSMiddleware

from api.config import (
    FORCE_EMBEDDINGS_DB_RELOAD,
    MODEL_TYPE_INFERENCE,
    MODEL_TYPE_EMBEDDING,
    PERSIST_DIRECTORY,
    REPO_NAME,
    REPO_URL,
    MODE,
)


class Query(BaseModel):
    prompt: str


def get_model():
    if MODE == "directory":
        return DirLoader(
            repo_path=REPO_URL,
            force_reingest=FORCE_EMBEDDINGS_DB_RELOAD,
            model_type_inference=MODEL_TYPE_INFERENCE,
            model_type_embedding=MODEL_TYPE_EMBEDDING,
            persist_directory=PERSIST_DIRECTORY,
        )
    elif MODE == "api":
        raise NotImplementedError
    raise Exception(f"Invalid ingestion mode {MODE}")


app = FastAPI(title=f"Repo {REPO_NAME}")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
model = get_model()


@app.get("/")
async def root():
    return {"message": "alive"}


@app.get("/api/settings")
async def root():
    return {
        "repo_name": REPO_NAME,
        "repo_url": REPO_URL,
        "message": f"Welcome to the {REPO_NAME} chatbot API. Use the /query endpoint to ask questions.",
        "warning_message": "This search engine may produce inaccurate explanations (called hallucinations), please verify the sources.",
    }


@app.post("/api/query")
async def query(query: Query):
    try:
        result, sources = model.retrieval_qa_inference(query.prompt, verbose=False)
        return {"result": result, "sources": sources}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=5328)
