import os

from flask import Flask, jsonify, request, render_template
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError

app = Flask(__name__)

DATABASE_URL = os.getenv("DATABASE_URL")

engine = (
    create_engine(DATABASE_URL, pool_pre_ping=True)
    if DATABASE_URL
    else None
)


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/health")
def health():
    return {"status": "UP"}


@app.route("/db-health")
def db_health():
    if engine is None:
        return jsonify({"database": "NOT_CONFIGURED"}), 503

    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        return jsonify({"database": "UP"}), 200

    except SQLAlchemyError:
        app.logger.exception("Database health check failed")
        return jsonify({"database": "DOWN"}), 503


@app.route("/tasks", methods=["POST"])
def create_task():
    if engine is None:
        return jsonify({"error": "Database not configured"}), 503

    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({"error": "Valid JSON object required"}), 400

    title = data.get("title")
    description = data.get("description", "")
    status = data.get("status", "pending")

    if not isinstance(title, str) or not title.strip() or len(title) > 200:
        return jsonify({"error": "Title must be 1-200 characters"}), 400

    if description is not None and not isinstance(description, str):
        return jsonify({"error": "Description must be text"}), 400

    if status not in ("pending", "in_progress", "completed"):
        return jsonify({"error": "Invalid status"}), 400

    try:
        with engine.begin() as connection:
            result = connection.execute(
                text("""
                    INSERT INTO tasks (title, description, status)
                    VALUES (:title, :description, :status)
                    RETURNING id
                """),
                {
                    "title": title.strip(),
                    "description": description,
                    "status": status
                }
            )
            task_id = result.scalar_one()

        return jsonify({"id": task_id, "message": "Task created"}), 201

    except SQLAlchemyError:
        app.logger.exception("Task creation failed")
        return jsonify({"error": "Database operation failed"}), 503


@app.route("/tasks", methods=["GET"])
def get_tasks():
    if engine is None:
        return jsonify({"error": "Database not configured"}), 503

    try:
        with engine.connect() as connection:
            rows = connection.execute(
                text("""
                    SELECT id, title, description, status, created_at
                    FROM tasks
                    ORDER BY id
                """)
            ).mappings().all()

        return jsonify([
            {
                "id": row["id"],
                "title": row["title"],
                "description": row["description"],
                "status": row["status"],
                "created_at": row["created_at"].isoformat()
                if row["created_at"] else None
            }
            for row in rows
        ]), 200

    except SQLAlchemyError:
        app.logger.exception("Task retrieval failed")
        return jsonify({"error": "Database operation failed"}), 503


@app.route("/tasks/<int:task_id>", methods=["GET"])
def get_task(task_id):
    if engine is None:
        return jsonify({"error": "Database not configured"}), 503

    try:
        with engine.connect() as connection:
            row = connection.execute(
                text("""
                    SELECT id, title, description, status, created_at
                    FROM tasks
                    WHERE id = :task_id
                """),
                {"task_id": task_id}
            ).mappings().first()

        if row is None:
            return jsonify({"error": "Task not found"}), 404

        return jsonify({
            "id": row["id"],
            "title": row["title"],
            "description": row["description"],
            "status": row["status"],
            "created_at": row["created_at"].isoformat()
            if row["created_at"] else None
        }), 200

    except SQLAlchemyError:
        app.logger.exception("Task retrieval failed")
        return jsonify({"error": "Database operation failed"}), 503


@app.route("/tasks/<int:task_id>", methods=["DELETE"])
def delete_task(task_id):
    if engine is None:
        return jsonify({"error": "Database not configured"}), 503

    try:
        with engine.begin() as connection:
            result = connection.execute(
                text("DELETE FROM tasks WHERE id = :task_id"),
                {"task_id": task_id}
            )

        if result.rowcount == 0:
            return jsonify({"error": "Task not found"}), 404

        return jsonify({"message": "Task deleted"}), 200

    except SQLAlchemyError:
        app.logger.exception("Task deletion failed")
        return jsonify({"error": "Database operation failed"}), 503


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
