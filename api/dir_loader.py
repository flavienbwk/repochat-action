import collections
from langchain_openai import ChatOpenAI
from langchain.chains import RetrievalQA
from langchain.prompts import PromptTemplate
from langchain_openai import OpenAIEmbeddings

from api.load_db import DataLoader


class DirLoader:
    """Create the necessary objects to create a QARetrieval chain"""

    def __init__(
        self,
        repo_path=None,
        force_reingest=True,
        model_type_inference=None,
        model_type_embedding=None,
        persist_directory=None,
    ):
        self.force_reingest = force_reingest
        self.model_type_inference = model_type_inference
        self.model_type_embedding = model_type_embedding
        self.repo_path = repo_path
        self.persist_directory = persist_directory

        self.template = self.get_template()
        self.embeddings = self.get_embeddings()
        self.llm = self.get_llm()
        self.prompt = self.get_prompt()

        if self.force_reingest:
            self.db = DataLoader(self.repo_path, self.persist_directory).set_db(
                self.embeddings
            )
        else:
            print("Loading cached DB...")
            self.db = DataLoader(self.repo_path, self.persist_directory).get_db(
                self.embeddings
            )
            print("Loaded.")

        self.retriever = self.db.as_retriever()
        self.retrieval_qa_chain = self.get_retrieval_qa()

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
            template=self.template, input_variables=["context", "question"]
        )
        return prompt

    def get_embeddings(self) -> OpenAIEmbeddings:
        embeddings = OpenAIEmbeddings(model=self.model_type_embedding)
        return embeddings

    def get_llm(self):
        llm = ChatOpenAI(model=self.model_type_inference)
        return llm

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
