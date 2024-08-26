# Imports
# Env var
import os
from dotenv import load_dotenv, find_dotenv

# Env variables
_ = load_dotenv(find_dotenv())

CURRENT_DIR=os.path.dirname(os.path.abspath(__file__))

REPO_NAME = os.environ['REPO_NAME'].strip()
REPO_URL = os.getenv('REPO_URL', '').strip()
REPO_PATH = os.environ['REPO_PATH'].strip()
OPEN_AI_API_KEY = os.environ['OPENAI_API_KEY'].strip()
MODEL_TYPE_INFERENCE = os.environ['MODEL_TYPE_INFERENCE'].strip()
MODEL_TYPE_EMBEDDING = os.environ['MODEL_TYPE_EMBEDDING'].strip()
FORCE_EMBEDDINGS_DB_RELOAD = True if os.environ['FORCE_EMBEDDINGS_DB_RELOAD'].strip().lower() == 'true' else False

PATH_NAME_SPLITTER = f'{CURRENT_DIR}/splitted_docs.jsonl'
PERSIST_DIRECTORY = f'{CURRENT_DIR}/db/chroma/'
EVALUATION_DATASET = f'{CURRENT_DIR}/data/evaluation_dataset.tsv'
