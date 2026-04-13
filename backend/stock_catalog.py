from datetime import datetime, timezone
import os
from pathlib import Path
import re
from typing import Dict, List

import pandas as pd


ROOT_DIR = Path(__file__).parent

PROJECTS = [
    {
        "id": "oficina",
        "name": "Oficina",
        "description": "Cat 6 / Cat 6A para puestos de trabajo, salas y áreas administrativas.",
    },
    {
        "id": "cctv",
        "name": "CCTV",
        "description": "Se prioriza Cat 5e para cámaras y enlaces de seguridad.",
    },
    {
        "id": "data-center",
        "name": "Data Center",
        "description": "Solo Cat 6A para backbone, patching y armado de rack.",
    },
]

BRANDS = [
    {
        "id": "siemon",
        "name": "Siemon",
        "description": "Selección estructurada según el stock técnico disponible.",
    },
    {
        "id": "panduit",
        "name": "Panduit",
        "description": "Incluye referencias Panduit y NetKey compatibles.",
    },
    {
        "id": "commscope",
        "name": "CommScope",
        "description": "Agrupa stock CommScope y SYSTIMAX cargado actualmente.",
    },
]

TECHNICAL_RULES = {
    "oficina": {
        "allowed_specs": ["cat6a", "cat6"],
        "project_note": "Cada bobina se calcula con 305 m y un máximo técnico de 100 m por punto.",
    },
    "cctv": {
        "allowed_specs": ["cat5e"],
        "project_note": "Para CCTV se filtran solo bobinas y accesorios Cat 5e.",
    },
    "data-center": {
        "allowed_specs": ["cat6a"],
        "project_note": "Para Data Center se trabaja exclusivamente con familia Cat 6A.",
    },
}

BOM_PRODUCT_ROLES = [
    {"role": "jack", "category": "jack", "strict_spec": True},
    {"role": "patch_cord", "category": "patch_cord", "strict_spec": True},
    {"role": "faceplate", "category": "faceplate", "strict_spec": False},
    {"role": "patch_panel", "category": "panel", "strict_spec": False},
]

SPEC_LABELS = {
    "cat5e": "Cat 5e",
    "cat6": "Cat 6",
    "cat6a": "Cat 6A",
}


def _normalize_brand(value: str) -> str | None:
    text = str(value).upper().strip()
    if "SIEMON" in text:
        return "siemon"
    if "PANDUIT" in text:
        return "panduit"
    if "COMMSCOPE" in text or "SYSTIMAX" in text:
        return "commscope"
    return None


def _normalize_article(value) -> str:
    if pd.isna(value):
        return "SIN-CODIGO"
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    return str(value).strip()


def _slugify(value: str) -> str:
    safe = []
    for char in value.lower():
        safe.append(char if char.isalnum() else "-")
    return "".join(safe).strip("-") or "item"


def _detect_category(description: str) -> str:
    text = description.lower()
    if "patch cord" in text:
        return "patch_cord"
    if "jack" in text:
        return "jack"
    if "faceplate" in text or "placa" in text or "caja montaje" in text:
        return "faceplate"
    if "panel" in text or "patchera" in text:
        return "panel"
    if "rack" in text:
        return "rack"
    if "organizador" in text:
        return "organizer"
    if "conector" in text or "adaptador" in text:
        return "connector"
    if "cable" in text:
        return "cable"
    return "accessory"


def _infer_spec(description: str, article: str) -> str | None:
    text = f"{description} {article}".lower()
    if "cat 5e" in text or "5e" in text:
        return "cat5e"
    if "cat 6a" in text or any(token in article.lower() for token in ["6a", "9a6", "z6a", "zm6a", "pul6x", "pfl6x", "6as"]):
        return "cat6a"
    if "cat 6" in text or any(token in article.lower() for token in ["9c6", "mc6", "cj688", "nk6"]):
        return "cat6"
    return None


def _display_name(description: str, category: str, spec: str | None) -> str:
    if not spec:
        return description
    label = SPEC_LABELS[spec]
    if label.lower() in description.lower():
        return description
    if category == "cable":
        return f"Bobina / {description} · {label}"
    return f"{description} · {label}"


def _stock_value(value) -> int:
    if pd.isna(value):
        return 0
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return 0


def _sort_by_stock(items: List[Dict], allowed_specs: List[str] | None = None) -> List[Dict]:
    spec_order = {spec: index for index, spec in enumerate(allowed_specs or [])}
    return sorted(
        items,
        key=lambda item: (spec_order.get(item.get("spec"), len(spec_order)), -item["stock"], item["name"]),
    )


def _sort_inventory(items: List[Dict]) -> List[Dict]:
    return sorted(items, key=lambda item: (item["category"], item["name"], -item["stock"]))


_DEFAULT_STOCK_URL = (
    "https://docs.google.com/spreadsheets/d/"
    "13db2bnxG8jT0qcgKwWOmuLP-wGUdWrh3/export?format=xlsx"
)


def _resolve_stock_source_url() -> str:
    source_url = os.environ.get("STOCK_SOURCE_URL", _DEFAULT_STOCK_URL)
    match = re.search(r"/spreadsheets/d/([a-zA-Z0-9-_]+)", source_url)
    if match:
        sheet_id = match.group(1)
        return f"https://docs.google.com/spreadsheets/d/{sheet_id}/export?format=xlsx"
    return source_url


def _load_items() -> List[Dict]:
    dataframe = pd.read_excel(_resolve_stock_source_url())
    items: List[Dict] = []

    for _, row in dataframe.iterrows():
        brand_id = _normalize_brand(row.get("Marca"))
        if not brand_id:
            continue

        article = _normalize_article(row.get("Artículo"))
        raw_name = str(row.get("Descripción Técnica Estimada", "")).strip() or article
        category = _detect_category(raw_name)
        spec = _infer_spec(raw_name, article)

        items.append(
            {
                "id": f"{brand_id}-{_slugify(article)}",
                "article": article,
                "name": _display_name(raw_name, category, spec),
                "stock": _stock_value(row.get("St. Actual")),
                "category": category,
                "source_brand": str(row.get("Marca", "")).strip(),
                "brand_id": brand_id,
                "spec": spec,
            }
        )

    return items


def _select_primary_cable(items: List[Dict], project_id: str) -> Dict | None:
    allowed_specs = TECHNICAL_RULES[project_id]["allowed_specs"]
    cable_candidates = [
        item for item in items if item["category"] == "cable" and item.get("spec") in allowed_specs
    ]
    if not cable_candidates:
        return None
    return _sort_by_stock(cable_candidates, allowed_specs)[0].copy()


def _select_role_product(items: List[Dict], category: str, allowed_specs: List[str], strict_spec: bool) -> Dict | None:
    matches = [item for item in items if item["category"] == category]
    if strict_spec:
        matches = [item for item in matches if item.get("spec") in allowed_specs]
    else:
        preferred = [item for item in matches if item.get("spec") in allowed_specs]
        if preferred:
            matches = preferred

    if not matches:
        return None

    return _sort_by_stock(matches, allowed_specs)[0].copy()


def _technical_rule_payload(project_id: str) -> Dict:
    rule = TECHNICAL_RULES[project_id]
    return {
        "cable_length_m": 305,
        "max_run_length_m": 100,
        "points_per_coil": 3,
        "jacks_per_point": 1,
        "faceplates_per_point": 1,
        "patch_cords_per_point": 2,
        "patch_panel_ports": 24,
        "project_note": rule["project_note"],
        "allowed_specs": rule["allowed_specs"],
    }


def load_configurator_catalog() -> Dict:
    items = _load_items()
    catalog: Dict[str, Dict[str, Dict]] = {project["id"]: {} for project in PROJECTS}
    inventory_by_brand: Dict[str, List[Dict]] = {}

    for brand in BRANDS:
        brand_items = [item for item in items if item["brand_id"] == brand["id"]]
        inventory_items = []
        for item in _sort_inventory(brand_items):
            inventory_item = item.copy()
            inventory_item.pop("brand_id", None)
            inventory_items.append(inventory_item)
        inventory_by_brand[brand["id"]] = inventory_items

        for project in PROJECTS:
            allowed_specs = TECHNICAL_RULES[project["id"]]["allowed_specs"]
            primary = _select_primary_cable(brand_items, project["id"])
            accessories: List[Dict] = []

            if primary:
                for blueprint in BOM_PRODUCT_ROLES:
                    product = _select_role_product(
                        brand_items,
                        blueprint["category"],
                        allowed_specs,
                        blueprint["strict_spec"],
                    )
                    if not product:
                        continue
                    product["role"] = blueprint["role"]
                    accessories.append(product)

                primary.pop("brand_id", None)
                for accessory in accessories:
                    accessory.pop("brand_id", None)

                availability_message = "Combinación compatible encontrada con stock técnico actual."
            else:
                availability_message = (
                    f"No hay bobina compatible {', '.join(SPEC_LABELS[spec] for spec in allowed_specs)} "
                    f"para {brand['name']} en el stock cargado."
                )

            catalog[project["id"]][brand["id"]] = {
                "available": primary is not None,
                "availability_message": availability_message,
                "primary_product": primary,
                "accessories": accessories,
                "technical_rule": _technical_rule_payload(project["id"]),
            }

    return {
        "company_name": "DACAS PY",
        "title": "Configurador de Stock Rápido",
        "subtitle": "Configurá desde celular u ordenador con BOM mínimo técnico, PDF y envío por WhatsApp.",
        "projects": PROJECTS,
        "brands": BRANDS,
        "catalog": catalog,
        "inventory_by_brand": inventory_by_brand,
        "meta": {
            "file_name": "Google Drive · Stock en vivo",
            "total_products": len(items),
            "loaded_at": datetime.now(timezone.utc).isoformat(),
        },
    }