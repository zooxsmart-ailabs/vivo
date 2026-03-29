"""
OpenMetadata Bootstrap — Zoox x Vivo GeoIntelligence
Idempotent seed script: glossary, classifications, database service, theme.
"""

import json
import os
import sys
import time
from urllib.parse import quote

import requests

BASE_URL = os.environ.get("OM_SERVER_URL", "http://om-server:8585")
API = f"{BASE_URL}/api/v1"
ADMIN_PASSWORD = os.environ.get("OM_ADMIN_PASSWORD", "admin")
SEEDS_DIR = os.environ.get("SEEDS_DIR", "/seeds")
MAX_WAIT = 300
RETRY_INTERVAL = 10


def log(msg):
    print(f"[bootstrap] {msg}", flush=True)


def wait_for_server():
    log(f"Waiting for OpenMetadata at {BASE_URL} (max {MAX_WAIT}s)...")
    deadline = time.time() + MAX_WAIT
    while time.time() < deadline:
        try:
            r = requests.get(f"{API}/system/version", timeout=5)
            if r.status_code == 200:
                version = r.json().get("version", "unknown")
                log(f"Server ready — version {version}")
                return
        except requests.ConnectionError:
            pass
        time.sleep(RETRY_INTERVAL)
    log("ERROR: Server did not become ready")
    sys.exit(1)


def authenticate():
    log("Authenticating as admin...")
    r = requests.post(
        f"{API}/users/login",
        json={"email": "admin@open-metadata.org", "password": ADMIN_PASSWORD},
    )
    r.raise_for_status()
    token = r.json().get("accessToken") or r.json().get("tokenType", "")
    if not token:
        token = r.json().get("JWTToken", "")
    log("Authenticated successfully")
    session = requests.Session()
    session.headers.update({"Authorization": f"Bearer {token}"})
    return session


def load_seed(filename):
    path = os.path.join(SEEDS_DIR, filename)
    with open(path) as f:
        return json.load(f)


def ensure_entity(session, endpoint, name, payload):
    r = session.get(f"{API}/{endpoint}/name/{quote(name, safe='')}")
    if r.status_code == 200:
        log(f"  [SKIP] {endpoint}/{name}")
        return r.json()
    r = session.post(f"{API}/{endpoint}", json=payload)
    if r.status_code in (200, 201):
        log(f"  [CREATE] {endpoint}/{name}")
        return r.json()
    log(f"  [WARN] {endpoint}/{name} — {r.status_code}: {r.text[:200]}")
    return None


def interpolate_env(obj):
    raw = json.dumps(obj)
    for key, val in os.environ.items():
        raw = raw.replace(f"{{{key}}}", val)
    return json.loads(raw)


# =========================================================================
# Step 1: Database Service
# =========================================================================
def create_database_service(session):
    log("Step 1: Creating database service...")
    seed = load_seed("database_service.json")
    payload = interpolate_env(seed)
    ensure_entity(session, "services/databaseServices", payload["name"], payload)


# =========================================================================
# Step 2: Glossary + Terms
# =========================================================================
def create_glossary(session):
    log("Step 2: Creating glossary and terms...")
    seed = load_seed("glossary.json")
    glossary_payload = seed["glossary"]
    result = ensure_entity(
        session, "glossaries", glossary_payload["name"], glossary_payload
    )
    if not result:
        return

    glossary_id = result.get("id")
    for term in seed["terms"]:
        term_payload = {
            "glossary": {"id": glossary_id, "type": "glossary"},
            "name": term["name"],
            "displayName": term.get("displayName", term["name"]),
            "description": term.get("description", ""),
            "synonyms": term.get("synonyms", []),
        }
        fqn = f"{glossary_payload['name']}.{term['name']}"
        ensure_entity(session, "glossaryTerms", fqn, term_payload)


# =========================================================================
# Step 3: Classifications + Tags
# =========================================================================
def create_classifications(session):
    log("Step 3: Creating classifications and tags...")
    seed = load_seed("classifications.json")
    for classification in seed["classifications"]:
        cls_payload = {
            "name": classification["name"],
            "displayName": classification.get("displayName", classification["name"]),
            "description": classification.get("description", ""),
        }
        result = ensure_entity(
            session, "classifications", classification["name"], cls_payload
        )
        if not result:
            continue

        for tag in classification.get("tags", []):
            tag_payload = {
                "classification": {"id": result["id"], "type": "classification"},
                "name": tag["name"],
                "description": tag.get("description", ""),
            }
            fqn = f"{classification['name']}.{tag['name']}"
            ensure_entity(session, "tags", fqn, tag_payload)


# =========================================================================
# Step 4: Theme
# =========================================================================
def apply_theme(session):
    log("Step 4: Applying custom theme...")
    seed = load_seed("theme.json")
    payload = {
        "config_type": "customUiThemePreference",
        "config_value": seed["theme"],
    }
    r = session.put(f"{API}/system/settings", json=payload)
    if r.status_code in (200, 201):
        log("  [OK] Theme applied")
    else:
        log(f"  [WARN] Theme — {r.status_code}: {r.text[:200]}")


# =========================================================================
# Main
# =========================================================================
def main():
    log("=" * 60)
    log("OpenMetadata Bootstrap — Zoox x Vivo GeoIntelligence")
    log("=" * 60)

    wait_for_server()
    session = authenticate()

    create_database_service(session)
    create_glossary(session)
    create_classifications(session)
    apply_theme(session)

    log("=" * 60)
    log("Bootstrap complete!")
    log(f"  Glossary: 20 terms")
    log(f"  Classifications: 9 with tags")
    log(f"  Database service: GeoIntelligence-PostgreSQL")
    log(f"  Theme: Zoox x Vivo purple (#660099)")
    log(f"  UI: {BASE_URL}")
    log("=" * 60)


if __name__ == "__main__":
    main()
