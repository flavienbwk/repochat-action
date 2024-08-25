import streamlit as st
from help_desk import HelpDesk
import nltk

from config import FORCE_EMBEDDINGS_DB_RELOAD, REPO_NAME


@st.cache_resource
def get_model():
    nltk.download("punkt")
    model = HelpDesk(new_db=FORCE_EMBEDDINGS_DB_RELOAD)
    return model


# Splash screen
st.set_page_config(page_title=f"Repo {REPO_NAME}")

model = get_model()

st.title(f"Repo - {REPO_NAME}")


with st.status("Informations d'usage"):
    st.info(
        "Welcome to this repo's chatbot. Ask your questions and our assistant will help you find the information you need.",
        icon="ℹ️",
    )
    st.warning(
        "Warning: This search engine may produce inaccurate explanations (called hallucinations), please verify the sources."
    )


if "messages" not in st.session_state:
    # Refer to https://platform.openai.com/docs/api-reference/chat/create
    st.session_state["messages"] = [
        {
            "role": "system",
            "content": f"You are an expert documentation and code analyst that has access to the {REPO_NAME} repo. When you think you don't know something, it's important that you say so. You always remain respectful.",
        },
        {"role": "assistant", "content": "What would you like to know ?"},
    ]

for msg in st.session_state.messages:
    if msg["role"] != "system":
        st.chat_message(msg["role"]).write(msg["content"])


if prompt := st.chat_input("What would you like to know ?"):
    # Add prompt
    st.session_state.messages.append({"role": "user", "content": prompt})
    st.chat_message("user").write(prompt)

    # Get answer
    result, sources = model.retrieval_qa_inference(prompt, verbose=False)

    # Add answer and sources
    st.chat_message("assistant").write(result + "  \n  \n" + sources)
    st.session_state.messages.append(
        {"role": "assistant", "content": result + "  \n  \n" + sources}
    )
