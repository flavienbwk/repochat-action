# Usage: python3 ingest_files.py /path/to/your/directory

import os
import requests
import argparse
import base64
from pathlib import Path

def is_valid_file(file_path):
    return os.path.isfile(file_path) and not file_path.startswith('.')

def send_file_to_api(file_path, api_url):
    with open(file_path, 'rb') as file:
        content = base64.b64encode(file.read()).decode('utf-8')
    
    metadata = {"source": os.path.basename(file_path)}
    
    payload = {
        "content": content,
        "metadata": metadata
    }
    
    response = requests.post(api_url, json=payload)
    return response

def main(directory_path, api_url):
    directory = Path(directory_path)
    if not directory.is_dir():
        print(f"Error: {directory_path} is not a valid directory.")
        return

    for root, _, files in os.walk(directory):
        for file in files:
            file_path = os.path.join(root, file)
            if is_valid_file(file_path):
                print(f"Sending file: {file_path}")
                response = send_file_to_api(file_path, api_url)
                if response.status_code == 200:
                    print(f"Successfully ingested: {file_path}")
                else:
                    print(f"Failed to ingest {file_path}. Status code: {response.status_code}")
            else:
                print(f"Skipping invalid or hidden file: {file_path}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Ingest files from a directory to the API")
    parser.add_argument("path", help="Path to the directory containing files to ingest")
    parser.add_argument("--endpoint", default="http://localhost:5328", help="API endpoint URL")
    args = parser.parse_args()

    main(args.path, f"{args.endpoint}/api/ingest")
