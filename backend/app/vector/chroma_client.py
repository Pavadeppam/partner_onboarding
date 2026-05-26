import chromadb
from chromadb.config import Settings
import os

class ChromaClient:
    def __init__(self, persist_directory: str = "db"):
        if not os.path.exists(persist_directory):
            os.makedirs(persist_directory)
        
        self.client = chromadb.PersistentClient(path=persist_directory)

    def get_or_create_collection(self, name: str):
        return self.client.get_or_create_collection(name=name)

    def delete_collection(self, name: str):
        return self.client.delete_collection(name=name)

    def reset_collection(self, name: str):
        try:
            self.client.delete_collection(name=name)
        except Exception:
            pass
        return self.client.get_or_create_collection(name=name)

    def add_documents(self, collection_name: str, ids: list[str], documents: list[str], embeddings: list[list[float]], metadatas: list[dict] = None):
        collection = self.get_or_create_collection(collection_name)
        collection.add(
            ids=ids,
            documents=documents,
            embeddings=embeddings,
            metadatas=metadatas
        )

    def query(self, collection_name: str, query_embeddings: list[list[float]], n_results: int = 5, where: dict | None = None):
        collection = self.get_or_create_collection(collection_name)
        args = {
            "query_embeddings": query_embeddings,
            "n_results": n_results,
        }
        if where:
            args["where"] = where
        return collection.query(**args)

# Singleton instance
chroma_service = ChromaClient()
