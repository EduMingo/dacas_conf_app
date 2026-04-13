"""Configurator API tests: technical availability, BOM coherence, and routing health."""

import os
from pathlib import Path

import pytest
import requests
from dotenv import dotenv_values


def _resolve_base_url() -> str:
    env_url = os.environ.get("REACT_APP_BACKEND_URL")
    if env_url:
        return env_url.rstrip("/")

    frontend_env = Path(__file__).resolve().parents[2] / "frontend" / ".env"
    env_values = dotenv_values(frontend_env)
    file_url = env_values.get("REACT_APP_BACKEND_URL")
    if file_url:
        return file_url.rstrip("/")

    pytest.skip("REACT_APP_BACKEND_URL is not configured")


BASE_URL = _resolve_base_url()


@pytest.fixture
def api_client():
    """Shared requests session for configurator endpoints."""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


class TestConfiguratorApi:
    """Stock configurator endpoint behavior and payload validation."""

    # Module: core configurator payload structure and technical-rule contract

    def test_configurator_returns_200_and_core_fields(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/configurator", timeout=20)
        assert response.status_code == 200

        data = response.json()
        assert data["title"] == "Configurador de Stock Rápido"
        assert data["company_name"] == "DACAS PY"
        assert isinstance(data["projects"], list)
        assert isinstance(data["brands"], list)
        assert isinstance(data["catalog"], dict)

    # Module: inventory-by-brand contract for manual stock browsing
    def test_inventory_by_brand_includes_brand_scoped_items(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/configurator", timeout=20)
        assert response.status_code == 200

        data = response.json()
        inventory_by_brand = data["inventory_by_brand"]
        brand_ids = {brand["id"] for brand in data["brands"]}

        assert isinstance(inventory_by_brand, dict)
        assert set(inventory_by_brand.keys()) == brand_ids

        siemon_inventory = inventory_by_brand["siemon"]
        assert isinstance(siemon_inventory, list)
        assert len(siemon_inventory) > 0

        first_item = siemon_inventory[0]
        assert isinstance(first_item["id"], str)
        assert isinstance(first_item["article"], str)
        assert isinstance(first_item["name"], str)
        assert isinstance(first_item["stock"], int)
        assert isinstance(first_item["category"], str)
        assert isinstance(first_item["source_brand"], str)

    def test_bundle_includes_new_technical_fields(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/configurator", timeout=20)
        assert response.status_code == 200

        data = response.json()
        bundle = data["catalog"]["oficina"]["siemon"]

        assert isinstance(bundle["available"], bool)
        assert isinstance(bundle["availability_message"], str)
        assert isinstance(bundle["technical_rule"], dict)

        rule = bundle["technical_rule"]
        assert rule["cable_length_m"] == 305
        assert rule["max_run_length_m"] == 100
        assert rule["points_per_coil"] == 3
        assert rule["jacks_per_point"] == 1
        assert rule["faceplates_per_point"] == 1
        assert rule["patch_cords_per_point"] == 2
        assert rule["patch_panel_ports"] == 24
        assert rule["allowed_specs"] == ["cat6a", "cat6"]

    def test_configurator_catalog_contains_expected_project_brand_mapping(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/configurator", timeout=20)
        assert response.status_code == 200

        data = response.json()
        catalog = data["catalog"]

        assert "oficina" in catalog
        assert "siemon" in catalog["oficina"]

        bundle = catalog["oficina"]["siemon"]
        assert "primary_product" in bundle
        assert "accessories" in bundle
        assert isinstance(bundle["accessories"], list)

    # Module: oficina + siemon baseline coherence for technical minimum BOM
    def test_oficina_siemon_bom_supports_expected_minimum_quantities(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/configurator", timeout=20)
        assert response.status_code == 200

        data = response.json()
        bundle = data["catalog"]["oficina"]["siemon"]
        assert bundle["available"] is True

        primary = bundle["primary_product"]
        accessories = bundle["accessories"]

        assert isinstance(primary["id"], str)
        assert isinstance(primary["name"], str)
        assert isinstance(primary["stock"], int)
        assert primary["category"] == "cable"
        assert primary["spec"] in ["cat6", "cat6a"]

        roles = {item["role"] for item in accessories}
        assert "jack" in roles
        assert "faceplate" in roles
        assert "patch_cord" in roles
        assert "patch_panel" in roles

        rule = bundle["technical_rule"]
        points_for_one_coil = rule["points_per_coil"]
        assert points_for_one_coil == 3
        assert points_for_one_coil * rule["jacks_per_point"] == 3
        assert points_for_one_coil * rule["patch_cords_per_point"] == 6
        assert max(1, points_for_one_coil // rule["patch_panel_ports"] + (1 if points_for_one_coil % rule["patch_panel_ports"] else 0)) == 1

    # Module: no-compatible-coil combinations should return explicit unavailability state
    def test_unavailable_combination_returns_clean_no_product_state(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/configurator", timeout=20)
        assert response.status_code == 200

        data = response.json()
        bundle = data["catalog"]["cctv"]["commscope"]

        assert bundle["available"] is False
        assert bundle["primary_product"] is None
        assert bundle["accessories"] == []
        assert "No hay bobina compatible" in bundle["availability_message"]
        assert bundle["technical_rule"]["allowed_specs"] == ["cat5e"]

    # Module: project-family technical constraints
    def test_project_allowed_spec_rules_are_enforced_in_payload(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/configurator", timeout=20)
        assert response.status_code == 200

        data = response.json()
        assert data["catalog"]["oficina"]["siemon"]["technical_rule"]["allowed_specs"] == ["cat6a", "cat6"]
        assert data["catalog"]["cctv"]["siemon"]["technical_rule"]["allowed_specs"] == ["cat5e"]
        assert data["catalog"]["data-center"]["siemon"]["technical_rule"]["allowed_specs"] == ["cat6a"]

    def test_api_root_endpoint_is_available(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/", timeout=20)
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Configurador de stock activo"
