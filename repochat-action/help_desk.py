import load_db
import collections
from langchain_openai import ChatOpenAI
from langchain.chains import RetrievalQA
from langchain.prompts import PromptTemplate
from langchain_openai import OpenAIEmbeddings

from config import (
    MODEL_TYPE_INFERENCE,
    MODEL_TYPE_EMBEDDING,
    REPO_PATH,
    PERSIST_DIRECTORY,
)


class HelpDesk:
    """Create the necessary objects to create a QARetrieval chain"""

    def __init__(self, new_db=True):

        self.new_db = new_db
        self.template = self.get_template()
        self.embeddings = self.get_embeddings()
        self.llm = self.get_llm()
        self.prompt = self.get_prompt()

        if self.new_db:
            self.db = load_db.DataLoader(REPO_PATH, PERSIST_DIRECTORY).set_db(
                self.embeddings
            )
        else:
            print("Loading cached DB...")
            self.db = load_db.DataLoader(REPO_PATH, PERSIST_DIRECTORY).get_db(
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
        embeddings = OpenAIEmbeddings(model=MODEL_TYPE_EMBEDDING)
        return embeddings

    def get_llm(self):
        llm = ChatOpenAI(model=MODEL_TYPE_INFERENCE)
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
        sources = [
            f'{res.metadata["source"]}'
            for res in answer["source_documents"]
        ]

        if sources:
            k = min(k, len(sources))
            distinct_sources = list(zip(*collections.Counter(sources).most_common()))[
                0
            ][:k]
            distinct_sources_str = "  \n- ".join(distinct_sources)

        if len(distinct_sources) == 1:
            return f"This source might help you :  \n- {distinct_sources_str}"
        elif len(distinct_sources) > 1:
            return f"Here are {len(distinct_sources)} sources that might help you :  \n- {distinct_sources_str}"
        else:
            return "Sorry I've not found any source that could help you."
