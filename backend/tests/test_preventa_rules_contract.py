"""Preventa contract tests: verify API-exposed technical rules align with requested engineering logic."""

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
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


class TestPreventaRulesContract:
    # Module: preventa rules contract exposed by /api/configurator

    def test_configurator_endpoint_is_reachable(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/configurator", timeout=20)
        assert response.status_code == 200

    def test_patch_panel_default_is_24_ports(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/configurator", timeout=20)
        assert response.status_code == 200

        data = response.json()
        for project_id in ["oficina", "cctv", "data-center"]:
            for brand_id in ["siemon", "panduit", "commscope"]:
                rule = data["catalog"][project_id][brand_id]["technical_rule"]
                assert rule["patch_panel_ports"] == 24

    def test_jacks_per_point_matches_requested_logic(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/configurator", timeout=20)
        assert response.status_code == 200

        data = response.json()
        # Requirement: "jacks 1 por punto + 5% reserva" -> base ratio should be 1 per point.
        # Reserve is expected to be applied in BOM calculations, not in this base ratio field.
        for project_id in ["oficina", "cctv", "data-center"]:
            for brand_id in ["siemon", "panduit", "commscope"]:
                rule = data["catalog"][project_id][brand_id]["technical_rule"]
                assert rule["jacks_per_point"] == 1