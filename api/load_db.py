import os
import logging
import shutil
import time
from langchain_chroma import Chroma

from langchain_community.document_loaders import DirectoryLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.text_splitter import MarkdownHeaderTextSplitter
from langchain_community.document_loaders.unstructured import UnstructuredFileLoader


class DataLoader:
    """Create, load, save the DB using the DirectoryLoader"""

    def __init__(
        self,
        source_directory,
        persist_directory,
    ):
        self.source_directory = source_directory
        self.persist_directory = persist_directory
        try:
            # create persist directory recursively
            os.makedirs(self.persist_directory, exist_ok=True)
        except Exception as e:
            logging.warning("%s", e)

    def load_from_directory(self):
        """Load files from the specified directory"""
        loader = DirectoryLoader(
            self.source_directory,
            glob="**/*",
            loader_cls=UnstructuredFileLoader,
            show_progress=True,
            use_multithreading=True,
            exclude=["*.jpg", "*.jpeg", "*.png", "*.gif", "*.bmp", "*.tiff", "*.webp"]
        )
        docs = loader.load()
        print("Number of documents retrieved:", len(docs))
        return docs

    def process_md_files(self, doc):
        headers_to_split_on = [
            ("#", "Titre 1"),
            ("##", "Sous-titre 1"),
            ("###", "Sous-titre 2"),
        ]

        markdown_splitter = MarkdownHeaderTextSplitter(
            headers_to_split_on=headers_to_split_on
        )

        md_doc = markdown_splitter.split_text(doc.page_content)
        for i in range(len(md_doc)):
            md_doc[i].metadata = md_doc[i].metadata | doc.metadata
        return md_doc

    def split_docs(self, docs):
        # Process documents based on their extension
        processed_docs = []
        for doc in docs:
            if doc.metadata.get('source', '').endswith('.md'):
                processed_docs.extend(self.process_md_files(doc))
            else:
                processed_docs.append(doc)

        # RecursiveTextSplitter
        # Chunk size big enough
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=512,
            chunk_overlap=20,
            separators=["\n\n", "\n", "(?<=\. )", " ", ""],
        )

        splitted_docs = splitter.split_documents(processed_docs)
        return splitted_docs

    def save_to_db(self, splitted_docs, embeddings):
        """Save chunks to Chroma DB"""
        for i, sub_splitted_doc in enumerate(splitted_docs):
            print(f"Saving document to DB: {i+1}/{len(splitted_docs)}")
            time.sleep(0.05)  # rate-limiting API calls to OpenAI
            db = Chroma.from_documents(
                [sub_splitted_doc], embeddings, persist_directory=self.persist_directory
            )
        return db

    def load_from_db(self, embeddings):
        """Load chunks from Chroma DB"""
        db = Chroma(
            persist_directory=self.persist_directory, embedding_function=embeddings
        )
        return db

    def set_db(self, embeddings):
        """Create, save, and load db"""
        try:
            shutil.rmtree(self.persist_directory)
        except Exception as e:
            logging.warning("%s", e)

        # Load docs
        docs = self.load_from_directory()

        # Split Docs
        splitted_docs = self.split_docs(docs)

        # Save to DB
        db = self.save_to_db(splitted_docs, embeddings)

        return db

    def get_db(self, embeddings):
        """Create, save, and load db"""
        db = self.load_from_db(embeddings)
        return db


if __name__ == "__main__":
    pass
