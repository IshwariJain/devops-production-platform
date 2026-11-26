from app import app


def test_home():
    client = app.test_client()
    response = client.get("/")

    assert response.status_code == 200
    assert response.mimetype == "text/html"
    assert b"DevOps Production Platform" in response.data
    assert b'id="task-form"' in response.data


def test_health():
    client = app.test_client()
    response = client.get("/health")

    assert response.status_code == 200
    assert response.get_json()["status"] == "UP"


def test_frontend_css():
    client = app.test_client()
    response = client.get("/static/css/style.css")

    assert response.status_code == 200
    assert response.mimetype == "text/css"
    assert len(response.data) > 0


def test_frontend_javascript():
    client = app.test_client()
    response = client.get("/static/js/app.js")

    assert response.status_code == 200
    assert response.mimetype in (
        "text/javascript",
        "application/javascript"
    )
    assert len(response.data) > 0
