from sentence_transformers import SentenceTransformer
import torch
import os
from pathlib import Path

class TextEmbeddingService:
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        backend_dir = Path(__file__).resolve().parents[2]
        default_local_dir = backend_dir / "models" / "all-MiniLM-L6-v2-local"

        model_path = os.getenv("SLM_MODEL_PATH")
        if model_path:
            p = Path(model_path).expanduser()
            if not p.is_absolute():
                p = (backend_dir / p).resolve()
            if p.exists():
                os.environ.setdefault("TRANSFORMERS_OFFLINE", "1")
                os.environ.setdefault("HF_HUB_OFFLINE", "1")
                model_name = str(p)
        elif default_local_dir.exists():
            os.environ.setdefault("TRANSFORMERS_OFFLINE", "1")
            os.environ.setdefault("HF_HUB_OFFLINE", "1")
            model_name = str(default_local_dir)

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
