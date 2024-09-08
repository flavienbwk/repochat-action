import os
import base64
import binascii
import shutil
import logging
from fastapi import FastAPI, HTTPException, Header, Depends, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel
from api.dir_loader import DirLoader
from api.api_loader import APILoader
from fastapi.middleware.cors import CORSMiddleware
from jose import JWTError, jwt
from datetime import datetime, timedelta
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

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

ACCESS_TOKEN_EXPIRE_MINUTES = 30

security = HTTPBearer(auto_error=False)


class Query(BaseModel):
    prompt: str


class ValidatePassword(BaseModel):
    password: str


class IngestData(BaseModel):
    content: str
    metadata: dict


def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, INTERFACE_PASSWORD, algorithm="HS256")
    return encoded_jwt


def verify_token(token: str):
    try:
        payload = jwt.decode(token, INTERFACE_PASSWORD, algorithms=["HS256"])
        return payload
    except JWTError:
        return None


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    payload = verify_token(token)
    if payload is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return payload


def get_model():
    if CLEAR_DB_AT_RESTART:
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

    if MODE == "directory":
        if REPO_PATH == "":
            raise Exception("Repo path is required for directory mode")
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
async def settings():
    return {
        "repo_name": REPO_NAME,
        "repo_url": REPO_URL,
        "message": f"Welcome to the {REPO_NAME} chatbot API. Use the /query endpoint to ask questions.",
        "warning_message": "This search engine may produce inaccurate explanations (called hallucinations), please verify the sources.",
        "interface_password_enabled": True if INTERFACE_PASSWORD else False,
    }


@app.post("/api/validate")
async def validate(data: ValidatePassword):
    if data.password == INTERFACE_PASSWORD:
        token = create_access_token(data={"sub": "user"})
        return {"access_token": token, "token_type": "bearer"}
    raise HTTPException(status_code=401, detail="Invalid password")


@app.get("/api/check")
async def check(current_user: dict = Depends(get_current_user)):
    return {"message": "Token is valid", "user": current_user}


def get_optional_current_user(
    credentials: HTTPAuthorizationCredentials = Security(security),
):
    if not INTERFACE_PASSWORD:
        return {"sub": "anonymous"}
    if credentials:
        token = credentials.credentials
        payload = verify_token(token)
        if payload:
            return payload
    raise HTTPException(status_code=401, detail="Invalid or expired token")


@app.post("/api/query")
async def query(query: Query, current_user: dict = Depends(get_optional_current_user)):
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
