from sentence_transformers import SentenceTransformer
import torch

class TextEmbeddingService:
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.model = SentenceTransformer(model_name, device=self.device)

    def encode(self, texts: list[str]):
        return self.model.encode(texts, convert_to_tensor=True).tolist()

    def get_similarity_score(self, text1: str, text2: str):
        embeddings = self.model.encode([text1, text2], convert_to_tensor=True)
        # Cosine similarity
        score = torch.nn.functional.cosine_similarity(embeddings[0].unsqueeze(0), embeddings[1].unsqueeze(0))
        return score.item()

# Singleton instance
text_service = TextEmbeddingService()
