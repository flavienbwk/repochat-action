from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain.chains import RetrievalQA
from langchain.prompts import PromptTemplate
from langchain_chroma import Chroma
from langchain.text_splitter import (
    RecursiveCharacterTextSplitter,
    MarkdownHeaderTextSplitter,
)
from langchain.schema import Document
import collections


class APILoader:

    def __init__(
        self,
        model_type_inference=None,
        model_type_embedding=None,
        persist_directory=None,
    ):
        self.model_type_inference = model_type_inference
        self.model_type_embedding = model_type_embedding
        self.persist_directory = persist_directory

        self.embeddings = self.get_embeddings()
        self.llm = self.get_llm()
        self.prompt = self.get_prompt()
        self.db = self.load_or_create_db()
        self.retriever = self.db.as_retriever()
        self.retrieval_qa_chain = self.get_retrieval_qa()

    def load_or_create_db(self):
        return Chroma(
            persist_directory=self.persist_directory, embedding_function=self.embeddings
        )

    def get_template(self):
        template = """
        Given this text extracts:
        -----
        {context}
        -----
        Please answer with to the following question:
        Question: {question}
        Helpful Answer:
        """
        return template

    def get_prompt(self) -> PromptTemplate:
        prompt = PromptTemplate(
            template=self.get_template(), input_variables=["context", "question"]
        )
        return prompt

    def get_embeddings(self) -> OpenAIEmbeddings:
        embeddings = OpenAIEmbeddings(model=self.model_type_embedding)
        return embeddings

    def get_llm(self):
        llm = ChatOpenAI(model=self.model_type_inference)
        return llm

    def load_or_create_db(self):
        return Chroma(
            persist_directory=self.persist_directory, embedding_function=self.embeddings
        )

    def get_retrieval_qa(self):
        chain_type_kwargs = {"prompt": self.prompt}
        qa = RetrievalQA.from_chain_type(
            llm=self.llm,
            chain_type="stuff",
            retriever=self.retriever,
            return_source_documents=True,
            chain_type_kwargs=chain_type_kwargs,
        )
        return qa

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

        splitted_docs = splitter.split_documents(processed_docs)
        return splitted_docs

    def ingest_data(self, content, metadata):
        doc = Document(page_content=content, metadata=metadata)
        split_docs = self.split_docs([doc])
        self.db.add_documents(split_docs)

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
