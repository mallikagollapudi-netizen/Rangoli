"""Backend API tests for Rangoli Studio /api/artworks CRUD endpoints."""
import os
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://rangoli-app-1.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def sample_free_payload():
    return {
        "name": "TEST_FreeArt1",
        "mode": "free",
        "background": "#3D261D",
        "width": 390,
        "height": 700,
        "strokes": [
            {"color": "#FFFFFF", "width": 6, "kind": "free",
             "points": [[10.0, 10.0], [20.0, 20.0], [30.0, 25.0]]}
        ],
    }


@pytest.fixture(scope="module")
def sample_dot_payload():
    return {
        "name": "TEST_DotRangoli1",
        "mode": "dot",
        "grid": {"layout": "square", "rows": 5, "cols": 5, "area": [24.0, 80.0, 342.0, 500.0]},
        "background": "#1E3A2B",
        "width": 390,
        "height": 700,
        "strokes": [
            {"color": "#FDD835", "width": 6, "kind": "line",
             "points": [[50.0, 100.0], [100.0, 150.0]]}
        ],
    }


# ---------- Health ----------
class TestHealth:
    def test_root(self, client):
        r = client.get(f"{API}/")
        assert r.status_code == 200
        assert r.json().get("message") == "Rangoli Studio API"


# ---------- CRUD ----------
class TestArtworkCRUD:
    created_ids: list = []

    def test_create_free(self, client, sample_free_payload):
        r = client.post(f"{API}/artworks", json=sample_free_payload)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "id" in data and isinstance(data["id"], str) and data["id"]
        assert "_id" not in data, "Response must not expose _id"
        assert data["name"] == sample_free_payload["name"]
        assert data["mode"] == "free"
        assert data["width"] == sample_free_payload["width"]
        assert len(data["strokes"]) == 1
        assert data["strokes"][0]["kind"] == "free"
        assert data.get("created_at") and data.get("updated_at")
        TestArtworkCRUD.created_ids.append(data["id"])

    def test_create_dot(self, client, sample_dot_payload):
        r = client.post(f"{API}/artworks", json=sample_dot_payload)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["mode"] == "dot"
        assert data["grid"]["layout"] == "square"
        assert data["grid"]["rows"] == 5
        TestArtworkCRUD.created_ids.append(data["id"])

    def test_list_contains_created(self, client):
        r = client.get(f"{API}/artworks")
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list)
        ids = {i["id"] for i in items}
        for cid in TestArtworkCRUD.created_ids:
            assert cid in ids
        for i in items:
            assert "_id" not in i

    def test_get_by_id(self, client):
        aid = TestArtworkCRUD.created_ids[0]
        r = client.get(f"{API}/artworks/{aid}")
        assert r.status_code == 200
        data = r.json()
        assert data["id"] == aid
        assert data["name"] == "TEST_FreeArt1"

    def test_get_not_found_invalid_id(self, client):
        r = client.get(f"{API}/artworks/not-a-valid-id")
        assert r.status_code == 404

    def test_get_not_found_valid_oid(self, client):
        r = client.get(f"{API}/artworks/507f1f77bcf86cd799439011")
        assert r.status_code == 404

    def test_update(self, client, sample_free_payload):
        aid = TestArtworkCRUD.created_ids[0]
        payload = dict(sample_free_payload)
        payload["name"] = "TEST_FreeArt1_Renamed"
        payload["strokes"] = []
        r = client.put(f"{API}/artworks/{aid}", json=payload)
        assert r.status_code == 200
        data = r.json()
        assert data["name"] == "TEST_FreeArt1_Renamed"
        assert data["strokes"] == []
        # Verify persistence
        g = client.get(f"{API}/artworks/{aid}")
        assert g.status_code == 200
        assert g.json()["name"] == "TEST_FreeArt1_Renamed"

    def test_update_not_found(self, client, sample_free_payload):
        r = client.put(f"{API}/artworks/507f1f77bcf86cd799439011", json=sample_free_payload)
        assert r.status_code == 404

    def test_validation_bad_payload(self, client):
        bad = {"name": "", "mode": "free", "background": "#000", "width": 1, "height": 1, "strokes": []}
        r = client.post(f"{API}/artworks", json=bad)
        assert r.status_code == 422

    def test_validation_bad_mode(self, client):
        bad = {"name": "x", "mode": "scribble", "background": "#000", "width": 1, "height": 1, "strokes": []}
        r = client.post(f"{API}/artworks", json=bad)
        assert r.status_code == 422

    def test_delete(self, client):
        # delete all tracked
        for aid in list(TestArtworkCRUD.created_ids):
            r = client.delete(f"{API}/artworks/{aid}")
            assert r.status_code == 200
            assert r.json().get("ok") is True
            g = client.get(f"{API}/artworks/{aid}")
            assert g.status_code == 404
            TestArtworkCRUD.created_ids.remove(aid)

    def test_delete_not_found(self, client):
        r = client.delete(f"{API}/artworks/507f1f77bcf86cd799439011")
        assert r.status_code == 404


def teardown_module(module):
    try:
        s = requests.Session()
        for a in s.get(f"{API}/artworks", timeout=10).json():
            if str(a.get("name", "")).startswith("TEST_"):
                s.delete(f"{API}/artworks/{a['id']}", timeout=10)
    except Exception:
        pass
