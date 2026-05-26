import json
import os
from app.ai.text_embedding_service import text_service
from app.vector.chroma_client import chroma_service

def init_vector_db():
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
    init_vector_db()
