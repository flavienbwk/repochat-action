import os
import base64
import binascii
import shutil
import logging
from datetime import datetime, timedelta
from typing import Dict

from fastapi import FastAPI, HTTPException, Header, Depends, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from jose import JWTError, jwt

from api.dir_loader import DirLoader
from api.api_loader import APILoader
from api.config import (
    CLEAR_DB_AT_RESTART,
    MODEL_TYPE_INFERENCE,
    MODEL_TYPE_EMBEDDING,
    PERSIST_DIRECTORY,
    INGEST_SECRET,
    INTERFACE_PASSWORD,
    REPO_NAME,
    REPO_PATH,
    REPO_URL,
    MODE,
)

# Constants
ACCESS_TOKEN_EXPIRE_MINUTES = 30
ALLOWED_ORIGINS = ["http://localhost:3000", "http://127.0.0.1:3000"]

# FastAPI security
security = HTTPBearer(auto_error=False)


# Pydantic models
class Query(BaseModel):
    prompt: str


class ValidatePassword(BaseModel):
    password: str


class IngestData(BaseModel):
    content: str
    metadata: Dict


# JWT functions
def create_access_token(data: Dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, INTERFACE_PASSWORD, algorithm="HS256")


def verify_token(token: str) -> Dict | None:
    try:
        return jwt.decode(token, INTERFACE_PASSWORD, algorithms=["HS256"])
    except JWTError:
        return None


# Authentication dependencies
def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> Dict:
    token = credentials.credentials
    payload = verify_token(token)
    if payload is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return payload


def get_optional_current_user(
    credentials: HTTPAuthorizationCredentials = Security(security),
) -> Dict:
    if not INTERFACE_PASSWORD:
        return {"sub": "anonymous"}
    if credentials:
        token = credentials.credentials
        payload = verify_token(token)
        if payload:
            return payload
    raise HTTPException(status_code=401, detail="Invalid or expired token")


# Model initialization
def get_model():
    if CLEAR_DB_AT_RESTART:
        clear_database()

    if MODE == "directory":
        if not REPO_PATH:
            raise ValueError("Repo path is required for directory mode")
        return DirLoader(
            repo_path=REPO_PATH,
            force_reingest=CLEAR_DB_AT_RESTART,
            model_type_inference=MODEL_TYPE_INFERENCE,
            model_type_embedding=MODEL_TYPE_EMBEDDING,
            persist_directory=PERSIST_DIRECTORY,
        )
    elif MODE == "api":
        return APILoader(
            model_type_inference=MODEL_TYPE_INFERENCE,
            model_type_embedding=MODEL_TYPE_EMBEDDING,
            persist_directory=PERSIST_DIRECTORY,
        )
    else:
        raise ValueError(f"Invalid ingestion mode {MODE}")


def clear_database():
    if os.path.exists(PERSIST_DIRECTORY):
        try:
            shutil.rmtree(PERSIST_DIRECTORY)
            logging.info(f"Cleared DB at {PERSIST_DIRECTORY}")
        except Exception as e:
            logging.warning(f"Error clearing DB: {e}")
    else:
        logging.info(
            f"DB directory {PERSIST_DIRECTORY} does not exist. No need to clear."
        )


# FastAPI app initialization
app = FastAPI(title=f"Repo {REPO_NAME}")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
model = get_model()


# API routes
@app.get("/")
async def root():
    return {"message": "alive"}


@app.get("/api/settings")
async def settings():
    return {
        "repo_name": REPO_NAME,
        "repo_url": REPO_URL,
        "message": f"Welcome to the {REPO_NAME} chatbot API. Use the /query endpoint to ask questions.",
        "warning_message": "This search engine may produce inaccurate explanations (called hallucinations), please verify the sources.",
        "interface_password_enabled": bool(INTERFACE_PASSWORD),
    }


@app.post("/api/validate")
async def validate(data: ValidatePassword):
    if data.password == INTERFACE_PASSWORD:
        token = create_access_token(data={"sub": "user"})
        return {"access_token": token, "token_type": "bearer"}
    raise HTTPException(status_code=401, detail="Invalid password")


@app.get("/api/check")
async def check(current_user: Dict = Depends(get_current_user)):
    return {"message": "Token is valid", "user": current_user}


@app.post("/api/query")
async def query(
    query: Query, current_user: Dict = Depends(get_optional_current_user)
) -> Dict[str, str | list]:
    try:
        result, sources = model.retrieval_qa_inference(query.prompt, verbose=False)
        return {"result": result, "sources": sources}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/ingest")
async def ingest(
    data: IngestData, x_ingest_secret: str = Header(..., alias="X-Ingest-Secret")
):
    if MODE != "api":
        raise HTTPException(
            status_code=400,
            detail="Ingestion is only available in API mode (set env MODE=api)",
        )
    if x_ingest_secret != INGEST_SECRET:
        raise HTTPException(status_code=401, detail="Invalid ingest secret")
    try:
        decoded_content = base64.b64decode(data.content).decode("utf-8")
        if not decoded_content.strip():
            raise HTTPException(
                status_code=400, detail="Decoded content cannot be empty"
            )
        model.ingest_data(decoded_content, data.metadata)
        return {"message": "Data ingested successfully"}
    except binascii.Error:
        raise HTTPException(status_code=400, detail="Invalid base64 encoding")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=5328)
