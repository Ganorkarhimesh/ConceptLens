"""Replaceable persistence interface: local JSON today, Firestore when configured."""

from __future__ import annotations

import copy
import json
import os
import re
import threading
from pathlib import Path
from typing import Any


CONCEPTS = ["Fractions", "LCM", "Algebra", "Percentages", "Basic Arithmetic"]
DEFAULT_MASTERY = {
    "Fractions": 35,
    "LCM": 50,
    "Algebra": 82,
    "Percentages": 76,
    "Basic Arithmetic": 92,
}


class DataService:
    """Small persistence contract shared by local and Firestore implementations."""

    def get_students(self) -> list[dict[str, Any]]:
        raise NotImplementedError

    def get_student(self, name: str) -> dict[str, Any] | None:
        raise NotImplementedError

    def save_student(self, student: dict[str, Any]) -> None:
        raise NotImplementedError

    def get_assessment(self, assessment_id: str) -> dict[str, Any] | None:
        raise NotImplementedError

    def get_assessments(self) -> list[dict[str, Any]]:
        raise NotImplementedError

    def save_assessment(self, assessment: dict[str, Any]) -> None:
        raise NotImplementedError

    def ensure_student(self, name: str) -> dict[str, Any]:
        student = self.get_student(name)
        if student:
            return student
        student = {
            "name": name,
            "concept_mastery": copy.deepcopy(DEFAULT_MASTERY),
        }
        self.save_student(student)
        return student


class LocalDataService(DataService):
    """Atomic JSON persistence for a single-machine demo; no database required."""

    def __init__(
        self,
        data_path: str | Path | None = None,
        seed_path: str | Path | None = None,
    ) -> None:
        backend_dir = Path(__file__).resolve().parents[2]
        self.data_path = Path(
            data_path
            or os.getenv("CONCEPTLENS_DATA_FILE")
            or backend_dir / "data" / "local_state.json"
        )
        self.seed_path = Path(seed_path or backend_dir / "data" / "seed.json")
        self._lock = threading.RLock()

    def _load(self) -> dict[str, Any]:
        source = self.data_path if self.data_path.exists() else self.seed_path
        with source.open("r", encoding="utf-8") as file:
            state = json.load(file)
        state.setdefault("students", [])
        state.setdefault("assessments", {})
        return state

    def _save(self, state: dict[str, Any]) -> None:
        self.data_path.parent.mkdir(parents=True, exist_ok=True)
        temporary_path = self.data_path.with_suffix(self.data_path.suffix + ".tmp")
        with temporary_path.open("w", encoding="utf-8") as file:
            json.dump(state, file, ensure_ascii=False, indent=2)
            file.flush()
            os.fsync(file.fileno())
        temporary_path.replace(self.data_path)

    def get_students(self) -> list[dict[str, Any]]:
        with self._lock:
            return copy.deepcopy(self._load()["students"])

    def get_student(self, name: str) -> dict[str, Any] | None:
        with self._lock:
            normalized_name = name.strip().casefold()
            for student in self._load()["students"]:
                if student["name"].strip().casefold() == normalized_name:
                    return copy.deepcopy(student)
        return None

    def save_student(self, student: dict[str, Any]) -> None:
        with self._lock:
            state = self._load()
            normalized_name = student["name"].strip().casefold()
            for index, current in enumerate(state["students"]):
                if current["name"].strip().casefold() == normalized_name:
                    state["students"][index] = copy.deepcopy(student)
                    self._save(state)
                    return
            state["students"].append(copy.deepcopy(student))
            self._save(state)

    def get_assessment(self, assessment_id: str) -> dict[str, Any] | None:
        with self._lock:
            result = self._load()["assessments"].get(assessment_id)
            return copy.deepcopy(result) if result else None

    def get_assessments(self) -> list[dict[str, Any]]:
        with self._lock:
            return copy.deepcopy(list(self._load()["assessments"].values()))

    def save_assessment(self, assessment: dict[str, Any]) -> None:
        with self._lock:
            state = self._load()
            state["assessments"][assessment["assessment_id"]] = copy.deepcopy(
                assessment
            )
            self._save(state)


class FirestoreDataService(DataService):
    """Firestore implementation behind the same contract as local JSON.

    The SDK and Application Default Credentials are only accessed when the
    Firestore adapter is selected; local demo mode does not need Google Cloud.
    """

    def __init__(self) -> None:
        self.project = os.getenv("GOOGLE_CLOUD_PROJECT", "").strip() or None
        self._firestore_client: Any | None = None

    def _client(self) -> Any:
        if self._firestore_client is None:
            try:
                from google.cloud import firestore
            except ImportError as exc:
                raise RuntimeError(
                    "Install google-cloud-firestore to use DATA_BACKEND=firestore."
                ) from exc
            self._firestore_client = firestore.Client(project=self.project)
        return self._firestore_client

    @staticmethod
    def _student_key(name: str) -> str:
        key = re.sub(r"[^a-z0-9]+", "-", name.casefold()).strip("-")
        return key or "student"

    def get_students(self) -> list[dict[str, Any]]:
        return [doc.to_dict() or {} for doc in self._client().collection("students").stream()]

    def get_student(self, name: str) -> dict[str, Any] | None:
        snapshot = (
            self._client()
            .collection("students")
            .document(self._student_key(name))
            .get()
        )
        return snapshot.to_dict() if snapshot.exists else None

    def save_student(self, student: dict[str, Any]) -> None:
        self._client().collection("students").document(
            self._student_key(student["name"])
        ).set(student)

    def get_assessment(self, assessment_id: str) -> dict[str, Any] | None:
        snapshot = (
            self._client().collection("assessments").document(assessment_id).get()
        )
        return snapshot.to_dict() if snapshot.exists else None

    def get_assessments(self) -> list[dict[str, Any]]:
        return [
            doc.to_dict() or {}
            for doc in self._client().collection("assessments").stream()
        ]

    def save_assessment(self, assessment: dict[str, Any]) -> None:
        assessment_id = assessment["assessment_id"]
        self._client().collection("assessments").document(assessment_id).set(
            assessment
        )


def create_data_service() -> DataService:
    backend = os.getenv("DATA_BACKEND", "local").strip().lower()
    if backend == "local":
        return LocalDataService()
    if backend == "firestore":
        return FirestoreDataService()
    raise ValueError("DATA_BACKEND must be either 'local' or 'firestore'.")
