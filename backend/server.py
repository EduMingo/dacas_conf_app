from datetime import datetime, timezone
import logging
import os
from pathlib import Path
from typing import Dict, List

from dotenv import load_dotenv
from fastapi import APIRouter, FastAPI, HTTPException
from pydantic import BaseModel
from starlette.middleware.cors import CORSMiddleware

from stock_catalog import load_configurator_catalog


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")


class ProjectOption(BaseModel):
    id: str
    name: str
    description: str


class BrandOption(BaseModel):
    id: str
    name: str
    description: str


class ProductItem(BaseModel):
    id: str
    article: str
    name: str
    stock: int
    category: str
    source_brand: str
    spec: str | None = None
    role: str | None = None
    ratio: int | None = None


class TechnicalRule(BaseModel):
    cable_length_m: int
    max_run_length_m: int
    points_per_coil: int
    jacks_per_point: int
    faceplates_per_point: int
    patch_cords_per_point: int
    patch_panel_ports: int
    project_note: str
    allowed_specs: List[str]


class BrandProjectCatalog(BaseModel):
    available: bool
    availability_message: str
    primary_product: ProductItem | None
    accessories: List[ProductItem]
    technical_rule: TechnicalRule


class CatalogMeta(BaseModel):
    file_name: str
    total_products: int
    loaded_at: str


class ConfiguratorResponse(BaseModel):
    company_name: str
    title: str
    subtitle: str
    projects: List[ProjectOption]
    brands: List[BrandOption]
    catalog: Dict[str, Dict[str, BrandProjectCatalog]]
    inventory_by_brand: Dict[str, List[ProductItem]]
    meta: CatalogMeta


app = FastAPI()
api_router = APIRouter(prefix="/api")
logger = logging.getLogger(__name__)


@api_router.get("/")
async def root():
    return {"message": "Configurador de stock activo"}


@api_router.get("/configurator", response_model=ConfiguratorResponse)
async def get_configurator():
    try:
        return load_configurator_catalog()
    except FileNotFoundError as exc:
        logger.exception("No se encontró el archivo de stock")
        raise HTTPException(status_code=500, detail="No se encontró el archivo de stock") from exc
    except Exception as exc:  # pragma: no cover - seguridad defensiva
        logger.exception("Error al cargar el catálogo")
        raise HTTPException(status_code=500, detail="No se pudo cargar el catálogo") from exc


@api_router.get("/health")
async def api_health_check():
    return {
        "status": "ok",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


app.include_router(api_router)

_cors_origins_raw = os.environ.get("CORS_ORIGINS", "*")
_cors_origins = [o.strip() for o in _cors_origins_raw.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=_cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)


@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }