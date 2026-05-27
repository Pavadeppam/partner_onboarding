import sys
from pathlib import Path
import shutil

backend_dir = Path(__file__).resolve().parents[2]
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import json
import os

def export_cached_slm_to_repo(model_id: str = "sentence-transformers/all-MiniLM-L6-v2"):
    hf_home = Path(os.environ.get("HF_HOME", Path.home() / ".cache" / "huggingface")).expanduser()
    hub_dir = hf_home / "hub"
    model_cache_dir = hub_dir / ("models--" + model_id.replace("/", "--"))

    if not model_cache_dir.exists():
        raise RuntimeError(f"Model cache not found at {model_cache_dir}")

    refs_main = model_cache_dir / "refs" / "main"
    snapshot_dir: Path | None = None

    if refs_main.exists():
        ref = refs_main.read_text().strip()
        if ref:
            candidate = model_cache_dir / "snapshots" / ref
            if candidate.exists():
                snapshot_dir = candidate

    if snapshot_dir is None:
        snapshots_root = model_cache_dir / "snapshots"
        if not snapshots_root.exists():
            raise RuntimeError(f"No snapshots folder found at {snapshots_root}")
        snapshots = [p for p in snapshots_root.iterdir() if p.is_dir()]
        if not snapshots:
            raise RuntimeError(f"No snapshots found under {snapshots_root}")
        snapshot_dir = sorted(snapshots, key=lambda p: p.stat().st_mtime, reverse=True)[0]

    dest_dir = backend_dir / "models" / "all-MiniLM-L6-v2-local"
    if dest_dir.exists():
        shutil.rmtree(dest_dir)
    dest_dir.parent.mkdir(parents=True, exist_ok=True)
    shutil.copytree(snapshot_dir, dest_dir)

    required = ["modules.json", "config.json"]
    missing = [name for name in required if not (dest_dir / name).exists()]
    if missing:
        raise RuntimeError(f"Export completed but missing expected files in {dest_dir}: {', '.join(missing)}")

    print(f"Exported cached SLM model to {dest_dir}")

def init_vector_db():
    from app.ai.text_embedding_service import text_service
    from app.vector.chroma_client import chroma_service

    # Load attributes
    catalog_path = os.path.join(os.path.dirname(__file__), "..", "metadata", "attributeCatalog.json")
    with open(catalog_path, "r") as f:
        catalog = json.load(f)

    ids = []
    documents = []
    embeddings = []
    metadatas = []

    for group in catalog:
        for attr in group["attributes"]:
            ids.append(attr["id"])
            documents.append(attr["label"])
            embedding = text_service.encode([f"{attr['label']} {attr.get('description', '')}"])[0]
            embeddings.append(embedding)
            metadatas.append({
                "canonical_id": attr["id"],
                "group": group["group"],
                "type": attr["type"],
                "mandatory": attr["mandatory"],
                "category": attr.get("category", "All"),
                "description": attr.get("description", "")
            })

    # Add to ChromaDB
    chroma_service.add_documents(
        collection_name="canonical_attributes",
        ids=ids,
        documents=documents,
        embeddings=embeddings,
        metadatas=metadatas
    )
    print(f"Initialized canonical_attributes collection with {len(ids)} attributes.")

if __name__ == "__main__":
    if "--export-slm" in sys.argv:
        export_cached_slm_to_repo()
    else:
        init_vector_db()
