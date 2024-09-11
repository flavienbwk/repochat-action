import os
import time
import logging
import collections
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain.chains import RetrievalQA
from langchain.prompts import PromptTemplate
from langchain_chroma import Chroma
from langchain_community.document_loaders import DirectoryLoader
from langchain.text_splitter import (
    RecursiveCharacterTextSplitter,
    MarkdownHeaderTextSplitter,
)
from langchain_community.document_loaders.unstructured import UnstructuredFileLoader


class DirLoader:
    """Create the necessary objects to create a QARetrieval chain"""

    def __init__(
        self,
        repo_path=None,
        force_reingest=True,
        model_type_inference=None,
        model_type_embedding=None,
        persist_directory=None,
        pg_connection_string=None,
    ):
        self.repo_path = repo_path
        self.persist_directory = persist_directory
        self.pg_connection_string = pg_connection_string
        self.model_type_inference = model_type_inference
        self.model_type_embedding = model_type_embedding

        self.embeddings = self.get_embeddings()
        self.llm = self.get_llm()
        self.prompt = self.get_prompt()

        if force_reingest:
            self.db = self.set_db()
        else:
            print("Loading cached DB...")
            self.db = self.get_db()
            print("Loaded.")

        self.retriever = self.db.as_retriever()
        self.retrieval_qa_chain = self.get_retrieval_qa()

    def get_template(self):
        return """
        Given this text extracts:
        -----
        {context}
        -----
        Please answer with to the following question:
        Question: {question}
        Helpful Answer:
        """

    def get_prompt(self) -> PromptTemplate:
        return PromptTemplate(
            template=self.get_template(), input_variables=["context", "question"]
        )

    def get_embeddings(self) -> OpenAIEmbeddings:
        return OpenAIEmbeddings(model=self.model_type_embedding)

    def get_llm(self):
        return ChatOpenAI(model=self.model_type_inference)

    def load_from_directory(self):
        """Load files from the specified directory"""
        loader = DirectoryLoader(
            self.repo_path,
            glob="**/*",
            loader_cls=UnstructuredFileLoader,
            show_progress=True,
            use_multithreading=True,
            exclude=["*.jpg", "*.jpeg", "*.png", "*.gif", "*.bmp", "*.tiff", "*.webp"],
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
        processed_docs = []
        for doc in docs:
            if doc.metadata.get("source", "").endswith(".md"):
                processed_docs.extend(self.process_md_files(doc))
            else:
                processed_docs.append(doc)

        splitter = RecursiveCharacterTextSplitter(
            chunk_size=2048,
            chunk_overlap=20,
            separators=["\n\n", "\n", "(?<=\. )", " ", ""],
        )

        return splitter.split_documents(processed_docs)

    def save_to_db(self, splitted_docs):
        """Save chunks to Chroma DB"""
        for i, sub_splitted_doc in enumerate(splitted_docs):
            print(f"Saving document to DB: {i+1}/{len(splitted_docs)}")
            time.sleep(0.05)  # rate-limiting API calls to OpenAI
            db = Chroma.from_documents(
                [sub_splitted_doc],
                self.embeddings,
                persist_directory=self.persist_directory,
            )
        return db

    def load_from_db(self):
        if self.pg_connection_string:
            print("Using PostgreSQL as storage backend.")
            from langchain_postgres import PGVector

            return PGVector(
                embeddings=self.embeddings,
                collection_name="repochat",
                connection=self.pg_connection_string,
                use_jsonb=True,
            )
        else:
            print("Using ChromaDB as storage backend.")
            return Chroma(
                persist_directory=self.persist_directory,
                embedding_function=self.embeddings,
            )

    def set_db(self):
        """Create, save, and load db"""
        docs = self.load_from_directory()
        splitted_docs = self.split_docs(docs)
        return self.save_to_db(splitted_docs)

    def get_db(self):
        """Create, save, and load db"""
        return self.load_from_db()

    def get_retrieval_qa(self):
        chain_type_kwargs = {"prompt": self.prompt}
        return RetrievalQA.from_chain_type(
            llm=self.llm,
            chain_type="stuff",
            retriever=self.retriever,
            return_source_documents=True,
            chain_type_kwargs=chain_type_kwargs,
        )

    def retrieval_qa_inference(self, question, verbose=True):
        query = {"query": question}
        answer = self.retrieval_qa_chain(query)
        sources = self.list_top_k_sources(answer, k=2)

        if verbose:
            print(sources)

        return answer["result"], sources

    def list_top_k_sources(self, answer, k=2):
        sources = [f'{res.metadata["source"]}' for res in answer["source_documents"]]
        distinct_sources = []

        if sources:
            k = min(k, len(sources))
            distinct_sources = list(zip(*collections.Counter(sources).most_common()))[
                0
            ][:k]
            print(distinct_sources)
        return distinct_sources if len(distinct_sources) >= 1 else []
