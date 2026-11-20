import os
import uuid

import pytest
from sqlalchemy import create_engine, text
from flask import Flask

from app import app


@pytest.fixture
def database():
    url = os.getenv("TEST_DATABASE_URL")

    if not url:
        if os.getenv("REQUIRE_DB_TEST") == "1":
            pytest.fail("TEST_DATABASE_URL is required in CI")
        pytest.skip("TEST_DATABASE_URL not configured")

    if "test" not in url.split("/")[-1].lower():
        pytest.fail("Integration tests require a dedicated test database")

    engine = create_engine(url, pool_pre_ping=True)

    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))

    yield engine

    engine.dispose()


def test_database_crud(database, monkeypatch):
    import app as app_module

    monkeypatch.setattr(app_module, "engine", database)

    client = app.test_client()
    unique_title = f"CI Integration Test {uuid.uuid4()}"

    response = client.post(
        "/tasks",
        json={
            "title": unique_title,
            "description": "Automated PostgreSQL integration test",
            "status": "pending"
        }
    )

    assert response.status_code == 201

    task_id = response.get_json()["id"]

    try:
        response = client.get(f"/tasks/{task_id}")

        assert response.status_code == 200
        assert response.get_json()["title"] == unique_title

    finally:
        client.delete(f"/tasks/{task_id}")
