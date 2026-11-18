import os

from flask import Flask, jsonify
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
    return {
        "message": "DevOps Production Platform is running!"
    }


@app.route("/health")
def health():
    return {
        "status": "UP"
    }


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


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
