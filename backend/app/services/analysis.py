"""Stable analysis interface with deterministic demo and Vertex AI implementations."""

from __future__ import annotations

import json
import os
import re
from typing import Any

from app.models import AnalysisResult, Language, Recovery
from app.questions import QUESTION_BY_ID
from app.services.data import DataService


GEMINI_PROMPT_TEMPLATE = """You are ConceptLens AI, a careful mathematics misconception analyst.
Analyze one student's answer to one diagnostic question. Return only valid structured JSON
that matches the supplied AnalysisResult schema. Identify the likely reasoning, not just the
correct answer. Be specific, kind, and concise. Do not claim a psychological trait.

Required response fields: question_id, prompt, selected_answer, correct_answer, is_correct,
concept, misconception, root_cause, prerequisite_gap, mastery_score, explanation,
worked_example, learning_tip, practice_questions.
If correct, set misconception, root_cause, and prerequisite_gap to null and explain the
correct strategy. If incorrect, give a plausible misconception and a prerequisite gap.
Keep mastery_score between 0 and 100. Include a worked example and two short practice prompts.
"""

FRACTION_RECOVERY: dict[Language, dict[str, Any]] = {
    "English": {
        "simple_explanation": (
            "Fractions need a common denominator before addition. The denominator names "
            "the size of the pieces. Rewrite both fractions as equal-sized pieces first; "
            "then add only the numerators."
        ),
        "worked_example": (
            "1/2 + 1/3\n"
            "LCM of 2 and 3 = 6\n"
            "1/2 = 3/6 and 1/3 = 2/6\n"
            "3/6 + 2/6 = 5/6"
        ),
        "learning_tip": (
            "Make the denominators match. Whatever you multiply the denominator by, "
            "multiply the numerator by too."
        ),
        "practice_questions": ["1/3 + 1/4 = ?", "2/5 + 1/10 = ?"],
    },
    "Hindi": {
        "simple_explanation": (
            "भिन्नों को जोड़ने से पहले उनके हर समान करना ज़रूरी है। हर बताता है कि एक "
            "पूरी वस्तु कितने बराबर भागों में बाँटी गई है। पहले दोनों भिन्नों को समान "
            "आकार वाले भागों में लिखें, फिर केवल अंश जोड़ें।"
        ),
        "worked_example": (
            "1/2 + 1/3\n"
            "2 और 3 का LCM = 6\n"
            "1/2 = 3/6 और 1/3 = 2/6\n"
            "3/6 + 2/6 = 5/6"
        ),
        "learning_tip": (
            "पहले हरों का LCM निकालें। हर को जितनी संख्या से गुणा करें, अंश को भी उसी "
            "संख्या से गुणा करें।"
        ),
        "practice_questions": ["1/3 + 1/4 = ?", "2/5 + 1/10 = ?"],
    },
    "Marathi": {
        "simple_explanation": (
            "अपूर्णांकांची बेरीज करण्यापूर्वी त्यांचे छेद समान करावे लागतात. छेद म्हणजे "
            "पूर्ण वस्तूचे समान भाग किती आहेत हे दर्शवतो. आधी दोन्ही अपूर्णांक समान "
            "आकाराच्या भागांत लिहा; मग फक्त अंशांची बेरीज करा."
        ),
        "worked_example": (
            "1/2 + 1/3\n"
            "2 आणि 3 चा LCM = 6\n"
            "1/2 = 3/6 आणि 1/3 = 2/6\n"
            "3/6 + 2/6 = 5/6"
        ),
        "learning_tip": (
            "आधी छेदांचा LCM काढा. छेदाला ज्या संख्येने गुणता, अंशालाही त्याच "
            "संख्येने गुणा."
        ),
        "practice_questions": ["1/3 + 1/4 = ?", "2/5 + 1/10 = ?"],
    },
}


def _normalize_answer(answer: str) -> str:
    normalized = answer.strip().lower()
    normalized = normalized.replace("−", "-").replace("×", "*").replace("÷", "/")
    normalized = re.sub(r"\s+", "", normalized)
    normalized = normalized.rstrip("=?")
    return normalized


class AnalysisService:
    def analyze_answer(
        self, question_id: str, student_name: str, answer: str
    ) -> AnalysisResult:
        raise NotImplementedError

    def get_recovery(
        self, focus_result: AnalysisResult, language: Language
    ) -> Recovery:
        raise NotImplementedError


class DemoAnalysisService(AnalysisService):
    """Local, deterministic answer-pattern rules for the five demo questions."""

    def __init__(self, data_service: DataService) -> None:
        self.data_service = data_service

    def analyze_answer(
        self, question_id: str, student_name: str, answer: str
    ) -> AnalysisResult:
        question = QUESTION_BY_ID[question_id]
        correct_answer = question["correct_answer"]
        is_correct = _normalize_answer(answer) == _normalize_answer(correct_answer)
        student = self.data_service.ensure_student(student_name)
        mastery = student.get("concept_mastery", {}).get(
            question["concept"], question["base_mastery"]
        )
        base = {
            "question_id": question_id,
            "prompt": question["prompt"],
            "selected_answer": answer.strip(),
            "correct_answer": correct_answer,
            "is_correct": is_correct,
            "concept": question["concept"],
            "mastery_score": int(mastery),
        }
        if is_correct:
            return AnalysisResult(
                **base,
                misconception=None,
                root_cause=None,
                prerequisite_gap=None,
                explanation=question["correct_explanation"],
                worked_example=question["correct_example"],
                learning_tip=question["correct_tip"],
                practice_questions=question["fallback"]["practice_questions"],
            )

        pattern = question["patterns"].get(
            _normalize_answer(answer), question["fallback"]
        )
        return AnalysisResult(
            **base,
            misconception=pattern["misconception"],
            root_cause=pattern["root_cause"],
            prerequisite_gap=pattern["prerequisite_gap"],
            explanation=pattern["explanation"],
            worked_example=pattern["worked_example"],
            learning_tip=pattern["learning_tip"],
            practice_questions=pattern["practice_questions"],
        )

    def get_recovery(
        self, focus_result: AnalysisResult, language: Language
    ) -> Recovery:
        if focus_result.concept == "Fractions" and language in FRACTION_RECOVERY:
            content = FRACTION_RECOVERY[language]
        else:
            content = {
                "simple_explanation": focus_result.explanation,
                "worked_example": focus_result.worked_example,
                "learning_tip": focus_result.learning_tip,
                "practice_questions": focus_result.practice_questions,
            }
        return Recovery(
            language=language,
            concept=focus_result.concept,
            **content,
        )


class GeminiAnalysisService(AnalysisService):
    """Vertex AI Gemini adapter. It is only activated when DEMO_MODE=false."""

    def __init__(self, data_service: DataService) -> None:
        self.data_service = data_service
        self.project = os.getenv("GOOGLE_CLOUD_PROJECT", "").strip()
        self.location = os.getenv("GOOGLE_CLOUD_LOCATION", "us-central1").strip()
        self.model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash").strip()
        self._client: Any | None = None

    def _get_client(self) -> Any:
        if not self.project:
            raise RuntimeError("GOOGLE_CLOUD_PROJECT is required when DEMO_MODE=false.")
        if not self.location:
            raise RuntimeError(
                "GOOGLE_CLOUD_LOCATION is required when DEMO_MODE=false."
            )
        if not self._client:
            try:
                from google import genai
            except ImportError as exc:
                raise RuntimeError(
                    "Install google-genai to use Vertex AI Gemini analysis."
                ) from exc
            self._client = genai.Client(
                vertexai=True,
                project=self.project,
                location=self.location,
            )
        return self._client

    def analyze_answer(
        self, question_id: str, student_name: str, answer: str
    ) -> AnalysisResult:
        question = QUESTION_BY_ID[question_id]
        correct_answer = question["correct_answer"]
        student = self.data_service.ensure_student(student_name)
        mastery = int(
            student.get("concept_mastery", {}).get(
                question["concept"], question["base_mastery"]
            )
        )
        prompt = (
            f"{GEMINI_PROMPT_TEMPLATE}\n"
            f"Question ID: {question_id}\n"
            f"Concept: {question['concept']}\n"
            f"Question: {question['prompt']}\n"
            f"Student answer: {answer}\n"
            f"Verified correct answer: {correct_answer}\n"
            f"Current mastery score: {mastery}\n"
            "Do not include the student's name in the response."
        )
        client = self._get_client()
        response = client.models.generate_content(
            model=self.model,
            contents=prompt,
            config={
                "response_mime_type": "application/json",
                "response_schema": AnalysisResult,
            },
        )
        response_text = response.text
        if not response_text:
            raise RuntimeError("Vertex AI returned an empty analysis response.")
        generated = AnalysisResult.model_validate_json(response_text)
        is_correct = _normalize_answer(answer) == _normalize_answer(correct_answer)
        if is_correct:
            return generated.model_copy(
                update={
                    "question_id": question_id,
                    "prompt": question["prompt"],
                    "selected_answer": answer.strip(),
                    "correct_answer": correct_answer,
                    "is_correct": True,
                    "concept": question["concept"],
                    "misconception": None,
                    "root_cause": None,
                    "prerequisite_gap": None,
                    "mastery_score": mastery,
                }
            )
        return generated.model_copy(
            update={
                "question_id": question_id,
                "prompt": question["prompt"],
                "selected_answer": answer.strip(),
                "correct_answer": correct_answer,
                "is_correct": False,
                "concept": question["concept"],
                "mastery_score": mastery,
            }
        )

    def get_recovery(
        self, focus_result: AnalysisResult, language: Language
    ) -> Recovery:
        # Keep the same deterministic localized fallback shape until the live
        # Gemini recovery-generation endpoint is added tomorrow.
        return DemoAnalysisService(self.data_service).get_recovery(
            focus_result, language
        )


def create_analysis_service(data_service: DataService) -> AnalysisService:
    demo_mode = os.getenv("DEMO_MODE", "true").strip().lower() in {
        "true",
        "1",
        "yes",
        "on",
    }
    if demo_mode:
        return DemoAnalysisService(data_service)
    return GeminiAnalysisService(data_service)
