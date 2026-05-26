import uuid

class MockTextEmbeddingService:
    def encode(self, texts: list[str]):
        return [[0.1] * 384 for _ in texts]

    def get_similarity_score(self, text1: str, text2: str):
        return 0.85

class MockChromaService:
    def query(self, collection_name, query_embeddings, n_results=5):
        return {
            "ids": [["internal_id", "color", "size"]],
            "documents": [["Internal SKU", "Color", "Size"]],
            "distances": [[0.1, 0.2, 0.3]],
            "metadatas": [[{"mandatory": True}, {"mandatory": True}, {"mandatory": True}]]
        }

text_service = MockTextEmbeddingService()
chroma_service = MockChromaService()
