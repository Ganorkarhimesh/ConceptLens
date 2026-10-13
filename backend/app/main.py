from __future__ import annotations

import os
from datetime import datetime, timezone
from statistics import mean
from typing import Any
from uuid import uuid4

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.models import (
    AnalysisResult,
    Assessment,
    AssessmentInput,
    ConceptMastery,
    ConceptWeakness,
    HealthStatus,
    Language,
    Question,
    Reassessment,
    ReassessmentInput,
    Recovery,
    StudentDashboard,
    TeacherDashboard,
    TeacherStudent,
)
from app.questions import QUESTION_BY_ID, QUESTIONS
from app.services.analysis import (
    AnalysisService,
    _normalize_answer,
    create_analysis_service,
)
from app.services.data import CONCEPTS, DEFAULT_MASTERY, DataService, create_data_service


def _truthy_env(name: str, default: str = "false") -> bool:
    return os.getenv(name, default).strip().lower() in {"true", "1", "yes", "on"}


app = FastAPI(
    title="ConceptLens AI API",
    version="0.1.0",
    description="Finds math misconceptions, identifies root causes, and supports targeted recovery.",
)

frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173").strip()
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(
        dict.fromkeys(
            [
                frontend_url,
                "http://localhost:5173",
                "http://127.0.0.1:5173",
            ]
        )
    ),
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Accept"],
)

data_service: DataService = create_data_service()
analysis_service: AnalysisService = create_analysis_service(data_service)


def _get_assessment_or_404(assessment_id: str) -> dict[str, Any]:
    assessment = data_service.get_assessment(assessment_id)
    if assessment is None:
        raise HTTPException(status_code=404, detail="Assessment not found.")
    return assessment


def _to_assessment(assessment: dict[str, Any]) -> Assessment:
    return Assessment.model_validate(assessment)


def _student_concept_scores(student: dict[str, Any]) -> dict[str, int]:
    saved_scores = student.get("concept_mastery", {})
    return {
        concept: int(saved_scores.get(concept, DEFAULT_MASTERY[concept]))
        for concept in CONCEPTS
    }


def _average_student_mastery(student: dict[str, Any]) -> int:
    return round(mean(_student_concept_scores(student).values()))


def _student_weak_concept(student: dict[str, Any]) -> str:
    scores = _student_concept_scores(student)
    return min(scores, key=scores.get)


def _intervention_status(mastery: int) -> str:
    if mastery < 60:
        return "Priority"
    if mastery < 67:
        return "Monitor"
    return "On track"


@app.get("/api/healthz", response_model=HealthStatus)
@app.get("/api/health", response_model=HealthStatus)
def health_check() -> HealthStatus:
    return HealthStatus(status="ok")


@app.get("/api/questions", response_model=list[Question])
def list_questions() -> list[Question]:
    return QUESTIONS


@app.post("/api/assessments", response_model=Assessment)
def submit_assessment(submission: AssessmentInput) -> Assessment:
    question_ids = [answer.question_id for answer in submission.answers]
    if len(set(question_ids)) != len(question_ids) or set(question_ids) != set(
        QUESTION_BY_ID
    ):
        raise HTTPException(
            status_code=422,
            detail="Submit one answer for each of the five diagnostic questions.",
        )

    answers_by_id = {answer.question_id: answer.answer for answer in submission.answers}
    results = [
        analysis_service.analyze_answer(
            question["id"], submission.student_name, answers_by_id[question["id"]]
        )
        for question in sorted(QUESTION_BY_ID.values(), key=lambda item: item["order"])
    ]
    focus_result = next((result for result in results if not result.is_correct), results[0])
    assessment_id = str(uuid4())
    completed_at = datetime.now(timezone.utc)
    assessment = Assessment(
        assessment_id=assessment_id,
        student_name=submission.student_name,
        score=sum(result.is_correct for result in results),
        total=len(results),
        results=results,
        focus_result=focus_result,
        completed_at=completed_at,
    )
    saved = assessment.model_dump(mode="json")
    saved["reassessment_state"] = {
        "attempts": 0,
        "resolved": False,
        "mastery_before": focus_result.mastery_score,
        "mastery_after": focus_result.mastery_score,
        "last_response": None,
    }
    data_service.save_assessment(saved)
    return assessment


@app.get("/api/assessments/{assessment_id}", response_model=Assessment)
def get_assessment(assessment_id: str) -> Assessment:
    return _to_assessment(_get_assessment_or_404(assessment_id))


@app.get(
    "/api/assessments/{assessment_id}/recovery/{language}",
    response_model=Recovery,
)
def get_recovery(assessment_id: str, language: Language) -> Recovery:
    assessment = _get_assessment_or_404(assessment_id)
    focus_result = AnalysisResult.model_validate(assessment["focus_result"])
    return analysis_service.get_recovery(focus_result, language)


@app.post(
    "/api/assessments/{assessment_id}/reassess",
    response_model=Reassessment,
)
def submit_reassessment(
    assessment_id: str, submission: ReassessmentInput
) -> Reassessment:
    assessment = _get_assessment_or_404(assessment_id)
    focus_result = AnalysisResult.model_validate(assessment["focus_result"])
    question_text = "What is 2/5 + 1/10?"
    options = ["3/15", "1/2", "3/10", "7/10"]
    correct_answer = "1/2"
    state = assessment.get(
        "reassessment_state",
        {
            "attempts": 0,
            "resolved": False,
            "mastery_before": focus_result.mastery_score,
            "mastery_after": focus_result.mastery_score,
            "last_response": None,
        },
    )

    if state.get("resolved") and state.get("last_response"):
        return Reassessment.model_validate(state["last_response"])

    is_correct = _normalize_answer(submission.answer) == _normalize_answer(
        correct_answer
    )
    mastery_before = int(state["mastery_before"])
    mastery_after = mastery_before
    explanation = (
        "Use tenths as common-sized pieces: 2/5 = 4/10, then 4/10 + 1/10 = 5/10 = 1/2."
        if is_correct
        else "Try rewriting 2/5 in tenths before adding. What number multiplied by 5 gives 10?"
    )
    if is_correct:
        mastery_after = min(100, max(mastery_before + 33, 68))
        student = data_service.ensure_student(assessment["student_name"])
        scores = _student_concept_scores(student)
        scores[focus_result.concept] = mastery_after
        student["concept_mastery"] = scores
        data_service.save_student(student)
        message = "Misconception resolved. You used a common denominator and reassessed successfully."
    else:
        message = "Let's try another approach. Rewrite both fractions with denominator 10 before adding."

    state["attempts"] = int(state.get("attempts", 0)) + 1
    state["resolved"] = is_correct
    state["mastery_after"] = mastery_after
    response = Reassessment(
        is_correct=is_correct,
        resolved=is_correct,
        mastery_before=mastery_before,
        mastery_after=mastery_after,
        message=message,
        question=question_text,
        options=options,
        correct_answer=correct_answer,
        explanation=explanation,
    )
    state["last_response"] = response.model_dump(mode="json")
    assessment["reassessment_state"] = state
    data_service.save_assessment(assessment)
    return response


@app.get("/api/student-dashboard", response_model=StudentDashboard)
def get_student_dashboard() -> StudentDashboard:
    student = data_service.ensure_student("Aarav Sharma")
    scores = _student_concept_scores(student)
    concept_mastery = [
        ConceptMastery(
            concept=concept,
            score=scores[concept],
            needs_attention=scores[concept] < 60,
        )
        for concept in CONCEPTS
    ]
    overall = round(mean(scores.values()))
    recovery_concept = min(scores, key=scores.get)
    recent = "Your five-concept diagnostic is ready"
    recent_assessments = [
        item
        for item in data_service.get_assessments()
        if item.get("student_name", "").casefold() == student["name"].casefold()
    ]
    if recent_assessments:
        latest = max(
            recent_assessments,
            key=lambda item: item.get("completed_at", ""),
        )
        recent = f"{latest.get('score', 0)}/{latest.get('total', 5)} correct · math diagnostic"
    return StudentDashboard(
        student_name=student["name"],
        overall_mastery=overall,
        concepts_mastered=sum(score >= 70 for score in scores.values()),
        concepts_needing_attention=sum(score < 60 for score in scores.values()),
        recent_assessment=recent,
        learning_progress=overall,
        recommended_recovery=f"{recovery_concept} · review the prerequisite",
        concept_mastery=concept_mastery,
    )


@app.get("/api/teacher-dashboard", response_model=TeacherDashboard)
def get_teacher_dashboard() -> TeacherDashboard:
    students = data_service.get_students()
    if not students:
        return TeacherDashboard(
            total_students=0,
            average_mastery=0,
            students_requiring_intervention=0,
            most_difficult_concept="Not enough class data",
            concept_weakness=[],
            ai_teacher_insight="Add student assessment data to see class-level guidance.",
            students=[],
        )

    class_averages = {
        concept: mean(_student_concept_scores(student)[concept] for student in students)
        for concept in CONCEPTS
    }
    class_sizes = len(students)
    weaknesses = [
        ConceptWeakness(
            concept=concept,
            struggling_percent=round(
                100
                * sum(
                    _student_concept_scores(student)[concept] < 60
                    for student in students
                )
                / class_sizes
            ),
        )
        for concept in CONCEPTS
    ]
    weaknesses.sort(key=lambda item: item.struggling_percent, reverse=True)

    teacher_students: list[TeacherStudent] = []
    for student in students:
        mastery = _average_student_mastery(student)
        teacher_students.append(
            TeacherStudent(
                name=student["name"],
                weak_concept=_student_weak_concept(student),
                mastery=mastery,
                intervention_status=_intervention_status(mastery),
            )
        )
    teacher_students.sort(key=lambda item: item.mastery)

    most_difficult = weaknesses[0].concept
    if most_difficult == "Fractions":
        insight = (
            "Students struggling with fractions frequently demonstrate weakness in "
            "LCM and common denominators. Consider revising these prerequisites before progressing."
        )
    else:
        insight = (
            f"{most_difficult} is the class's largest current gap. Review its prerequisite "
            "skills, then use a short targeted reassessment to check understanding."
        )

    return TeacherDashboard(
        total_students=class_sizes,
        average_mastery=round(mean(item.mastery for item in teacher_students)),
        students_requiring_intervention=sum(
            item.intervention_status != "On track" for item in teacher_students
        ),
        most_difficult_concept=most_difficult,
        concept_weakness=weaknesses,
        ai_teacher_insight=insight,
        students=teacher_students,
    )
