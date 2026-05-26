import os
import json
import uuid
from datetime import datetime, timezone
import math
import re
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

from app.ai.text_embedding_service import text_service
from app.vector.chroma_client import chroma_service
from app.rules.apparel_rules import validate_mapping

print("Starting Partner Onboarding AI Platform (AI Mode)...")
app = FastAPI(title="Partner Onboarding AI Platform")
print("FastAPI initialized.")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

METADATA_PATH = os.path.join(os.path.dirname(__file__), "metadata")

def load_metadata(filename: str):
    path = os.path.join(METADATA_PATH, filename)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail=f"Metadata {filename} not found")
    with open(path, "r") as f:
        return json.load(f)

def load_optional_metadata(filename: str, default: Any):
    path = os.path.join(METADATA_PATH, filename)
    if not os.path.exists(path):
        return default
    with open(path, "r") as f:
        return json.load(f)

# Models
class MappingRequest(BaseModel):
    partner_attributes: List[Dict[str, Any]]
    business_context: Dict[str, Any]

class ApprovalRequest(BaseModel):
    mapping_id: str
    approver: str
    status: str
    business_context: Optional[Dict[str, Any]] = None
    mappings: Optional[List[Dict[str, Any]]] = None

def normalize_partner_key(text: str) -> str:
    return "".join([c for c in (text or "").lower().strip() if c.isalnum()])

def load_ontology():
    ontology = load_optional_metadata("ontology.json", {}) or {}
    return {
        "abbreviation_dictionary": ontology.get("abbreviation_dictionary", {}) or {},
        "stopwords": ontology.get("stopwords", []) or [],
        "apparel_attribute_ontology": ontology.get("apparel_attribute_ontology", {}) or {},
        "image_role_ontology": ontology.get("image_role_ontology", {}) or {},
        "seo_attribute_ontology": ontology.get("seo_attribute_ontology", {}) or {},
        "barcode_identifier_ontology": ontology.get("barcode_identifier_ontology", {}) or {},
        "product_attribute_ontology": ontology.get("product_attribute_ontology", {}) or {},
        "pricing_ontology": ontology.get("pricing_ontology", {}) or {},
        "compliance_ontology": ontology.get("compliance_ontology", {}) or {},
        "apparel_category_taxonomy": ontology.get("apparel_category_taxonomy", {}) or {},
        "size_normalization": ontology.get("size_normalization", {}) or {},
        "material_ontology": ontology.get("material_ontology", {}) or {},
        "marketplace_alias_ontology": ontology.get("marketplace_alias_ontology", {}) or {},
        "domain_classification_list": ontology.get("domain_classification_list", {}) or {},
        "negative_mapping_rules": ontology.get("negative_mapping_rules", {}) or {},
        "attribute_type_definitions": ontology.get("attribute_type_definitions", {}) or {},
        "class_normalization": ontology.get("class_normalization", {}) or {},
        "candidate_id_hints": ontology.get("candidate_id_hints", {}) or {},
        "sample_value_class_hints": ontology.get("sample_value_class_hints", {}) or {},
    }

def _canonicalize_text(text: str) -> str:
    s = (text or "").lower()
    s = re.sub(r"[_/\\\-]+", " ", s)
    s = re.sub(r"[^a-z0-9\s]+", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s

def semantic_preprocess(field_name: str, description: str, stopwords: List[str]):
    combined = f"{field_name or ''} {description or ''}".strip()
    canon = _canonicalize_text(combined)
    stop = {s.lower().strip() for s in (stopwords or []) if s and isinstance(s, str)}
    tokens = [t for t in canon.split() if t and t not in stop]
    return {
        "raw_text": combined,
        "canonical_text": canon,
        "tokens": tokens,
        "stopwords_applied": sorted(stop),
    }

def abbreviation_expand(preprocessed: Dict[str, Any], abbreviation_dictionary: Dict[str, str]):
    text = preprocessed.get("canonical_text", "")
    abbr = {str(k).lower(): str(v).lower() for k, v in (abbreviation_dictionary or {}).items() if k and v}
    hits: List[Dict[str, Any]] = []
    expanded = text

    for key in sorted(abbr.keys(), key=len, reverse=True):
        parts = key.split("_")
        if len(parts) > 1:
            pattern = r"\b" + r"[_\s]+".join([re.escape(p) for p in parts]) + r"\b"
        else:
            pattern = r"\b" + re.escape(key) + r"\b"
        if not re.search(pattern, expanded):
            continue
        expanded = re.sub(pattern, abbr[key], expanded)
        hits.append({"abbr": key, "expanded": abbr[key]})

    expanded = _canonicalize_text(expanded)
    tokens = [t for t in expanded.split() if t]
    return {
        **preprocessed,
        "expanded_text": expanded,
        "expanded_tokens": tokens,
        "abbreviation_hits": hits,
    }

def _iter_ontology_sections(ontology: Dict[str, Any]):
    return [
        ("apparel_attribute_ontology", ontology.get("apparel_attribute_ontology", {})),
        ("image_role_ontology", ontology.get("image_role_ontology", {})),
        ("seo_attribute_ontology", ontology.get("seo_attribute_ontology", {})),
        ("barcode_identifier_ontology", ontology.get("barcode_identifier_ontology", {})),
        ("product_attribute_ontology", ontology.get("product_attribute_ontology", {})),
        ("pricing_ontology", ontology.get("pricing_ontology", {})),
        ("compliance_ontology", ontology.get("compliance_ontology", {})),
    ]

def ontology_normalize(expanded: Dict[str, Any], ontology: Dict[str, Any]):
    text = expanded.get("expanded_text") or expanded.get("canonical_text") or ""
    class_normalization = ontology.get("class_normalization", {}) or {}

    class_scores: Dict[str, float] = {}
    hits: List[Dict[str, Any]] = []

    for section_name, section in _iter_ontology_sections(ontology):
        if not isinstance(section, dict):
            continue
        for cls, phrases in section.items():
            if not cls or not isinstance(phrases, list):
                continue
            matched_phrases: List[str] = []
            for p in phrases:
                p = (p or "").lower().strip()
                if not p:
                    continue
                if p in text:
                    matched_phrases.append(p)
            if not matched_phrases:
                continue

            strength = min(0.25, 0.04 * sum(max(1, len(p.split())) for p in matched_phrases))
            class_scores[cls] = max(class_scores.get(cls, 0.0), strength)
            hits.append({
                "section": section_name,
                "class": cls,
                "matched_phrases": matched_phrases,
                "strength": strength,
            })

    normalized_scores: Dict[str, float] = {}
    for cls, score in class_scores.items():
        norm = class_normalization.get(cls, cls)
        normalized_scores[norm] = max(normalized_scores.get(norm, 0.0), float(score))

    ranked = sorted(
        [{"class": c, "score": s} for c, s in normalized_scores.items()],
        key=lambda x: x["score"],
        reverse=True,
    )
    return {
        "normalized_classes": ranked,
        "ontology_hits": hits,
    }

def attribute_classifier(expanded: Dict[str, Any], ontology: Dict[str, Any], normalized: Dict[str, Any]):
    text = expanded.get("expanded_text") or expanded.get("canonical_text") or ""
    domain_list = ontology.get("domain_classification_list", {}) or {}
    domain_scores: Dict[str, float] = {}
    for domain, keywords in domain_list.items():
        if not domain or not isinstance(keywords, list):
            continue
        matched = [k for k in keywords if k and str(k).lower() in text]
        if not matched:
            continue
        domain_scores[domain] = min(1.0, 0.2 * len(matched))

    primary_class = None
    class_score = 0.0
    ranked = normalized.get("normalized_classes") or []
    if ranked:
        primary_class = ranked[0]["class"]
        class_score = float(ranked[0]["score"] or 0.0)

    return {
        "primary_class": primary_class,
        "primary_class_score": class_score,
        "domain_scores": domain_scores,
    }

def detect_sample_value_signals(sample_value: str):
    v = (sample_value or "").strip()
    features: Dict[str, Any] = {}

    if not v:
        return features

    low = v.lower()
    features["raw"] = v

    if re.search(r"\.(jpg|jpeg|png|webp|gif)$", low):
        features["is_image"] = True

    if re.fullmatch(r"(xs|s|m|l|xl|xxl|xxxl|\d{1,3})", low):
        features["looks_like_size"] = True

    if re.search(r"#([0-9a-f]{6}|[0-9a-f]{3})\b", low) or any(w in low for w in ["blue", "black", "white", "red", "green", "grey", "gray", "navy", "beige"]):
        features["looks_like_color"] = True

    if re.fullmatch(r"\d{8,14}", re.sub(r"\s+", "", v)):
        features["looks_like_barcode"] = True

    if re.fullmatch(r"\d{6,10}", re.sub(r"\s+", "", v)) and not features.get("looks_like_barcode"):
        features["looks_like_hsn"] = True

    if "%" in v and any(w in low for w in ["cotton", "poly", "viscose", "wool", "linen", "elastane", "spandex"]):
        features["looks_like_composition"] = True

    if re.search(r"\b(bangladesh|india|china|vietnam|turkey|italy|spain|portugal|usa|uk)\b", low):
        features["looks_like_country"] = True
    return features

def _similarity_from_distance(dist: Optional[float]) -> float:
    if dist is None:
        return 0.0
    d = float(dist)
    if d < 0:
        d = 0.0
    return 1.0 / (1.0 + d)

def _infer_target_classes(canonical_attr: Dict[str, Any], ontology: Dict[str, Any]):
    label = canonical_attr.get("label", "") or ""
    desc = canonical_attr.get("description", "") or ""
    pre = semantic_preprocess(label, desc, ontology.get("stopwords", []))
    exp = abbreviation_expand(pre, ontology.get("abbreviation_dictionary", {}))
    norm = ontology_normalize(exp, ontology)
    classes = [c["class"] for c in (norm.get("normalized_classes") or [])[:3]]
    return classes

def _negative_rule_blocks(input_classes: List[str], target_classes: List[str], ontology: Dict[str, Any]):
    rules = ontology.get("negative_mapping_rules", {}) or {}
    blocked_by: List[Dict[str, Any]] = []
    for in_cls in input_classes:
        rule = rules.get(in_cls) or {}
        cannot = rule.get("cannot_map_to") or []
        cannot_set = {str(x) for x in cannot if x}
        overlap = [t for t in target_classes if t in cannot_set]
        if overlap:
            blocked_by.append({"input_class": in_cls, "blocked_target_classes": overlap})
    return blocked_by

def load_historical_mapping_counts():
    approvals_dir = os.path.join(METADATA_PATH, "approvals")
    history: Dict[str, Dict[str, int]] = {}
    if not os.path.exists(approvals_dir):
        return history

    for name in os.listdir(approvals_dir):
        if not name.endswith(".json"):
            continue
        try:
            with open(os.path.join(approvals_dir, name), "r") as f:
                rec = json.load(f)
        except Exception:
            continue
        if rec.get("status") != "approved":
            continue
        mappings = rec.get("mappings") or []
        for m in mappings:
            partner = m.get("partner_attribute") or m.get("partner_field") or ""
            norm = normalize_partner_key(partner)
            suggested = m.get("suggested_mapping") or {}
            internal_id = suggested.get("internal_attribute") or suggested.get("id") or suggested.get("internal_id")
            if not norm or not internal_id:
                continue
            history.setdefault(norm, {})
            history[norm][internal_id] = history[norm].get(internal_id, 0) + 1

    return history

def ensure_vector_db_initialized():
    catalog = load_metadata("attributeCatalog.json")
    expected_count = sum(len(g.get("attributes", [])) for g in catalog)

    def rebuild():
        chroma_service.reset_collection("canonical_attributes")
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
                    "description": attr.get("description", ""),
                })

        chroma_service.add_documents(
            collection_name="canonical_attributes",
            ids=ids,
            documents=documents,
            embeddings=embeddings,
            metadatas=metadatas
        )

    collection = chroma_service.get_or_create_collection("canonical_attributes")
    if collection.count() != expected_count:
        rebuild()
        return

    probe_emb = text_service.encode(["Color"])[0]
    try:
        probe_res = chroma_service.query(
            collection_name="canonical_attributes",
            query_embeddings=[probe_emb],
            n_results=1
        )
        meta0 = None
        if probe_res.get("metadatas") and probe_res["metadatas"][0]:
            meta0 = probe_res["metadatas"][0][0]
        if not isinstance(meta0, dict) or "canonical_id" not in meta0:
            rebuild()
            return
    except Exception:
        rebuild()
        return

    probes = ["Color", "Sleeve Length"]
    probe_embeddings = text_service.encode(probes)
    top_ids = []
    for emb in probe_embeddings:
        probe_res = chroma_service.query(
            collection_name="canonical_attributes",
            query_embeddings=[emb],
            n_results=1
        )
        if probe_res.get("ids") and probe_res["ids"][0]:
            top_ids.append(probe_res["ids"][0][0])

    if len(top_ids) == 2 and top_ids[0] == top_ids[1]:
        rebuild()

# Endpoints
@app.get("/api/metadata/business-context")
async def get_business_context():
    return load_metadata("businessModels.json")

@app.get("/api/metadata/attributes")
async def get_attributes():
    return load_metadata("attributeCatalog.json")

@app.get("/api/metadata/workflow")
async def get_workflow():
    return load_metadata("workflowConfig.json")

@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    return {
        "filename": file.filename,
        "status": "success",
        "sample_data": [
            {"partner_attribute": "Shade", "description": "Color of the item", "sample_value": "Midnight Blue"},
            {"partner_attribute": "Cloth Type", "description": "Material used", "sample_value": "100% Cotton"},
            {"partner_attribute": "Sleeve Style", "description": "Type of sleeve", "sample_value": "Short Sleeve"},
            {"partner_attribute": "Lifestyle Image", "description": "Main product photo", "sample_value": "img_001.jpg"}
        ]
    }

@app.post("/api/generate-mapping")
async def generate_mapping(request: MappingRequest):
    ensure_vector_db_initialized()
    ontology = load_ontology()
    catalog = load_metadata("attributeCatalog.json")
    canonical_by_id: Dict[str, Dict[str, Any]] = {}
    canonical_group_by_id: Dict[str, str] = {}
    for group in catalog:
        for attr in group.get("attributes", []):
            canonical_by_id[attr["id"]] = attr
            canonical_group_by_id[attr["id"]] = group.get("group", "")

    history = load_historical_mapping_counts()
    results = []
    
    for attr in request.partner_attributes:
        partner_raw = attr.get("partner_attribute", "")
        partner_key = normalize_partner_key(partner_raw)
        field_desc = attr.get("description", "")
        pre = semantic_preprocess(partner_raw, field_desc, ontology.get("stopwords", []))
        exp = abbreviation_expand(pre, ontology.get("abbreviation_dictionary", {}))
        norm = ontology_normalize(exp, ontology)
        cls = attribute_classifier(exp, ontology, norm)

        sample_features = detect_sample_value_signals(attr.get("sample_value", ""))
        sample_hints = ontology.get("sample_value_class_hints", {}) or {}
        sample_class_scores: Dict[str, float] = {}
        for feat, spec in sample_hints.items():
            if not sample_features.get(feat):
                continue
            hint_class = spec.get("class")
            weight = float(spec.get("weight", 0.0))
            if hint_class:
                sample_class_scores[hint_class] = max(sample_class_scores.get(hint_class, 0.0), weight)

        input_classes_ranked = norm.get("normalized_classes") or []
        for c, s in sample_class_scores.items():
            input_classes_ranked.append({"class": c, "score": s})
        input_classes_ranked = sorted(input_classes_ranked, key=lambda x: float(x.get("score", 0.0)), reverse=True)
        primary_class = input_classes_ranked[0]["class"] if input_classes_ranked else cls.get("primary_class")
        primary_class_score = float(input_classes_ranked[0].get("score", 0.0)) if input_classes_ranked else float(cls.get("primary_class_score", 0.0))

        query_text = exp.get("expanded_text") or pre.get("canonical_text") or f"{partner_raw} {field_desc}"
        query_embedding = text_service.encode([query_text])[0]

        candidate_id_hints = ontology.get("candidate_id_hints", {}) or {}
        hinted_ids = candidate_id_hints.get(primary_class, []) if primary_class else []
        hinted_ids = [cid for cid in hinted_ids if cid in canonical_by_id]

        where_filter = None
        if hinted_ids:
            where_filter = {"canonical_id": {"$in": hinted_ids}}

        raw_search = None
        try:
            raw_search = chroma_service.query(
                collection_name="canonical_attributes",
                query_embeddings=[query_embedding],
                n_results=15 if where_filter else 25,
                where=where_filter
            )
        except Exception:
            raw_search = chroma_service.query(
                collection_name="canonical_attributes",
                query_embeddings=[query_embedding],
                n_results=25
            )

        candidates: Dict[str, Dict[str, Any]] = {}
        ids = (raw_search.get("ids") or [[]])[0] or []
        dists = (raw_search.get("distances") or [[]])[0] or [None] * len(ids)

        for i, cid in enumerate(ids):
            if cid not in canonical_by_id:
                continue
            if hinted_ids and cid not in hinted_ids:
                continue
            canonical = canonical_by_id[cid]
            sim = _similarity_from_distance(dists[i] if i < len(dists) else None)
            candidates[cid] = {
                "internal_attribute": cid,
                "label": canonical.get("label", ""),
                "metadata": {
                    "canonical_id": cid,
                    "group": canonical_group_by_id.get(cid, ""),
                    "type": canonical.get("type", "string"),
                    "mandatory": canonical.get("mandatory", False),
                    "category": canonical.get("category", "All"),
                    "description": canonical.get("description", ""),
                },
                "semantic_confidence": sim,
                "boosts": {},
                "final_confidence": sim,
            }

        if hinted_ids:
            for cid in hinted_ids:
                if cid not in canonical_by_id or cid in candidates:
                    continue
                canonical = canonical_by_id[cid]
                candidates[cid] = {
                    "internal_attribute": cid,
                    "label": canonical.get("label", ""),
                    "metadata": {
                        "canonical_id": cid,
                        "group": canonical_group_by_id.get(cid, ""),
                        "type": canonical.get("type", "string"),
                        "mandatory": canonical.get("mandatory", False),
                        "category": canonical.get("category", "All"),
                        "description": canonical.get("description", ""),
                    },
                    "semantic_confidence": 0.0,
                    "boosts": {},
                    "final_confidence": 0.0,
                }

        class_boost = min(0.25, float(primary_class_score or 0.0))
        if class_boost and hinted_ids:
            for cid in hinted_ids:
                if cid in candidates:
                    candidates[cid]["boosts"]["class_hint"] = max(candidates[cid]["boosts"].get("class_hint", 0.0), class_boost)

        if partner_key in history:
            for cid, count in history[partner_key].items():
                if cid not in canonical_by_id:
                    continue
                if cid not in candidates:
                    canonical = canonical_by_id[cid]
                    candidates[cid] = {
                        "internal_attribute": cid,
                        "label": canonical.get("label", ""),
                        "metadata": {
                            "canonical_id": cid,
                            "group": canonical_group_by_id.get(cid, ""),
                            "type": canonical.get("type", "string"),
                            "mandatory": canonical.get("mandatory", False),
                            "category": canonical.get("category", "All"),
                            "description": canonical.get("description", ""),
                        },
                        "semantic_confidence": 0.0,
                        "boosts": {},
                        "final_confidence": 0.0,
                    }
                candidates[cid]["boosts"]["history"] = max(
                    candidates[cid]["boosts"].get("history", 0.0),
                    min(0.25, 0.08 * math.log(count + 1)),
                )

        blocked_candidates: Dict[str, List[Dict[str, Any]]] = {}
        effective_input_classes: List[str] = []
        if primary_class:
            effective_input_classes = [primary_class]
        else:
            for c in input_classes_ranked:
                if c.get("class"):
                    effective_input_classes = [c["class"]]
                    break
        for cid in list(candidates.keys()):
            target_classes = _infer_target_classes(canonical_by_id[cid], ontology)
            blocked_by = _negative_rule_blocks(effective_input_classes, target_classes, ontology)
            if blocked_by:
                blocked_candidates[cid] = blocked_by
                del candidates[cid]

        for cid, c in candidates.items():
            base = float(c.get("semantic_confidence", 0.0))
            boosts = c.get("boosts", {})
            final_conf = base + float(boosts.get("class_hint", 0.0)) + float(boosts.get("history", 0.0))
            final_conf = max(0.0, min(0.99, final_conf))
            c["final_confidence"] = final_conf

        ranked = sorted(candidates.values(), key=lambda x: x.get("final_confidence", 0.0), reverse=True)
        top = ranked[:5]
        all_matches = [
            {
                "id": t["internal_attribute"],
                "internal_attribute": t["internal_attribute"],
                "attribute": t["internal_attribute"],
                "group": (t.get("metadata") or {}).get("group", ""),
                "label": t["label"],
                "confidence": float(t["final_confidence"]),
                "metadata": t["metadata"],
            }
            for t in top
        ]
        best_match = all_matches[0] if all_matches else None

        warnings = []
        if best_match:
            validation_data = {
                "internal_attribute": best_match["internal_attribute"],
                "category": request.business_context.get("category", "All"),
                "mandatory": best_match["metadata"].get("mandatory", False)
            }
            warnings = validate_mapping(validation_data)

        confidence = best_match["confidence"] if best_match else 0
        status = "high" if confidence > 0.8 else "medium" if confidence > 0.5 else "low"
        
        reasoning = "No suitable match found in the canonical catalog."
        if best_match:
            reasoning = f"Pipeline selected '{best_match['label']}' (confidence {(confidence*100):.0f}%). "
            if primary_class:
                reasoning += f"Predicted class: {primary_class}. "
            if exp.get("abbreviation_hits"):
                ab = [f"{h['abbr']}→{h['expanded']}" for h in exp["abbreviation_hits"][:5]]
                reasoning += f"Abbreviation expansion: {', '.join(ab)}. "
            if norm.get("ontology_hits"):
                oh = norm["ontology_hits"][:4]
                reasoning += "Ontology matches: " + ", ".join([f"{h['class']} ({h['section']})" for h in oh]) + ". "
            if sample_features:
                keys = [k for k in sample_features.keys() if k != "raw" and sample_features.get(k)]
                if keys:
                    reasoning += f"Sample value signals: {', '.join(keys)}. "
            if partner_key in history:
                reasoning += "Historical approvals boosted previously approved mappings for this field. "
            reasoning += f"Canonical definition used: '{best_match['metadata'].get('description', '')}'."
            if warnings:
                reasoning += " Note: Governance rules have flagged potential compliance issues for this mapping."

        results.append({
            "partner_attribute": attr["partner_attribute"],
            "description": attr.get("description", ""),
            "sample_value": attr.get("sample_value", ""),
            "suggested_mapping": best_match,
            "all_matches": all_matches,
            "confidence": confidence,
            "status": status,
            "warnings": warnings,
            "ai_reasoning": reasoning,
            "evidence": {
                "pipeline": {
                    "semantic_preprocessor": pre,
                    "abbreviation_expander": {
                        "expanded_text": exp.get("expanded_text"),
                        "abbreviation_hits": exp.get("abbreviation_hits", []),
                    },
                    "ontology_normalizer": norm,
                    "attribute_classifier": {
                        **cls,
                        "primary_class": primary_class,
                        "primary_class_score": primary_class_score,
                    },
                },
                "sample_value_features": sample_features,
                "history_available": partner_key in history,
                "filtered_retrieval": {
                    "class": primary_class,
                    "hinted_ids": hinted_ids[:25],
                    "where_filter_used": where_filter is not None,
                },
                "negative_rule_blocks": blocked_candidates,
            }
        })
        
    return {
        "mapping_id": str(uuid.uuid4()),
        "mappings": results
    }

@app.post("/api/approve")
async def approve_mapping(request: ApprovalRequest):
    # In a real app, we would save to a database. For POC, we'll save to a JSON file.
    approvals_dir = os.path.join(METADATA_PATH, "approvals")
    if not os.path.exists(approvals_dir):
        os.makedirs(approvals_dir)
    
    file_path = os.path.join(approvals_dir, f"{request.mapping_id}.json")
    approval_data = {
        "mapping_id": request.mapping_id,
        "status": request.status,
        "approver": request.approver,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "business_context": request.business_context,
        "mappings": request.mappings,
    }
    
    with open(file_path, "w") as f:
        json.dump(approval_data, f)

    return {
        "mapping_id": request.mapping_id,
        "status": request.status,
        "message": f"Mapping {request.mapping_id} has been {request.status} by {request.approver}"
    }

@app.get("/")
async def root():
    return {"message": "Partner Onboarding AI API is running (AI Mode)"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
