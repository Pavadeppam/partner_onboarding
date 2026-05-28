from sentence_transformers import SentenceTransformer
import torch
import os
from pathlib import Path
import zipfile

class TextEmbeddingService:
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        backend_dir = Path(__file__).resolve().parents[2]
        default_local_dir = backend_dir / "models" / "all-MiniLM-L6-v2-local"
        default_local_zip = backend_dir / "models" / "all-MiniLM-L6-v2-local.zip"

        if not default_local_dir.exists() and default_local_zip.exists():
            extract_to = default_local_dir
            extract_to.parent.mkdir(parents=True, exist_ok=True)
            with zipfile.ZipFile(default_local_zip, "r") as zf:
                for info in zf.infolist():
                    name = info.filename
                    if not name or name.endswith("/"):
                        continue
                    dest = (extract_to / name).resolve()
                    if extract_to not in dest.parents and dest != extract_to:
                        raise RuntimeError(f"Unsafe path in model zip: {name}")
                    dest.parent.mkdir(parents=True, exist_ok=True)
                    with zf.open(info, "r") as src, open(dest, "wb") as out:
                        out.write(src.read())

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
