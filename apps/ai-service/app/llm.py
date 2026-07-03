"""Factories de LLM y embeddings — Azure OpenAI o OpenAI directo.

El AI service decide el provider en runtime según las env vars:
  · use_azure=True  → AzureChatOpenAI / AzureOpenAIEmbeddings
  · use_azure=False → ChatOpenAI / OpenAIEmbeddings (dev local)
"""

from functools import lru_cache
from langchain_openai import (
    ChatOpenAI,
    OpenAIEmbeddings,
    AzureChatOpenAI,
    AzureOpenAIEmbeddings,
)
from langchain_core.embeddings import Embeddings
from langchain_core.language_models.chat_models import BaseChatModel

from app.config import get_settings


@lru_cache
def get_chat_model() -> BaseChatModel:
    s = get_settings()
    if s.use_azure:
        if s.azure_openai_reasoning:
            # Modelos de razonamiento (familia GPT-5): NO aceptan `temperature`
            # custom ni `max_tokens`; usan `max_completion_tokens`. `reasoning_effort`
            # acota latencia/costo (los sugeridores son JSON estructurado, no exploración).
            return AzureChatOpenAI(
                azure_endpoint=s.azure_openai_endpoint,
                api_key=s.azure_openai_api_key,
                api_version=s.azure_openai_api_version,
                azure_deployment=s.azure_openai_chat_deployment,
                reasoning_effort=s.azure_openai_reasoning_effort,
                max_completion_tokens=s.max_tokens_per_call,
            )
        return AzureChatOpenAI(
            azure_endpoint=s.azure_openai_endpoint,
            api_key=s.azure_openai_api_key,
            api_version=s.azure_openai_api_version,
            azure_deployment=s.azure_openai_chat_deployment,
            max_tokens=s.max_tokens_per_call,
            temperature=0.4,
        )
    return ChatOpenAI(
        api_key=s.openai_api_key,
        model=s.openai_chat_model,
        max_tokens=s.max_tokens_per_call,
        temperature=0.4,
    )


@lru_cache
def get_embeddings() -> Embeddings:
    s = get_settings()
    if s.use_azure:
        return AzureOpenAIEmbeddings(
            azure_endpoint=s.azure_openai_endpoint,
            api_key=s.azure_openai_api_key,
            api_version=s.azure_openai_api_version,
            azure_deployment=s.azure_openai_embedding_deployment,
        )
    return OpenAIEmbeddings(
        api_key=s.openai_api_key,
        model=s.openai_embedding_model,
    )
