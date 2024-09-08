# Usage: python3 ingest_files.py /path/to/your/directory_or_file --ingest-secret YOUR_SECRET

import os
import requests
import argparse
import base64
from pathlib import Path

def is_valid_file(file_path):
    return os.path.isfile(file_path) and not os.path.basename(file_path).startswith('.')

def send_file_to_api(file_path, api_url, ingest_secret):
    with open(file_path, 'rb') as file:
        content = base64.b64encode(file.read()).decode('utf-8')
    
    metadata = {"source": os.path.basename(file_path)}
    
    payload = {
        "content": content,
        "metadata": metadata
    }
    
    headers = {
        "X-Ingest-Secret": ingest_secret
    }
    
    response = requests.post(api_url, json=payload, headers=headers)
    return response

def process_path(path, api_url, ingest_secret):
    if os.path.isfile(path):
        if is_valid_file(path):
            print(f"Sending file: {path}")
            response = send_file_to_api(path, api_url, ingest_secret)
            if response.status_code == 200:
                print(f"Successfully ingested: {path}")
            else:
                print(f"Failed to ingest {path}. Status code: {response.status_code}")
        else:
            print(f"Skipping invalid or hidden file: {path}")
    elif os.path.isdir(path):
        for root, _, files in os.walk(path):
            for file in files:
                file_path = os.path.join(root, file)
                process_path(file_path, api_url, ingest_secret)
    else:
        print(f"Error: {path} is not a valid file or directory.")

def main(path, api_url, ingest_secret):
    process_path(path, api_url, ingest_secret)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Ingest files from a directory or a single file to the API")
    parser.add_argument("path", help="Path to the directory or file to ingest")
    parser.add_argument("--endpoint", default="http://localhost:5328", help="API endpoint URL")
    parser.add_argument("--ingest-secret", required=True, help="Secret key for API authentication")
    args = parser.parse_args()

    main(args.path, f"{args.endpoint}/api/ingest", args.ingest_secret)
