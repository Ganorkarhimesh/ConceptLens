from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator


Language = Literal["English", "Hindi", "Marathi"]


class HealthStatus(BaseModel):
    status: str


class Question(BaseModel):
    id: str
    concept: str
    prompt: str
    options: list[str]
    order: int


class AnswerInput(BaseModel):
    question_id: str
    answer: str

    @field_validator("answer")
    @classmethod
    def answer_must_not_be_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Answer cannot be blank.")
        return value


class AssessmentInput(BaseModel):
    student_name: str = Field(min_length=1, max_length=80)
    answers: list[AnswerInput] = Field(min_length=5, max_length=5)

    @field_validator("student_name")
    @classmethod
    def student_name_must_not_be_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Student name cannot be blank.")
        return value


class AnalysisResult(BaseModel):
    question_id: str
    prompt: str
    selected_answer: str
    correct_answer: str
    is_correct: bool
    concept: str
    misconception: str | None
    root_cause: str | None
    prerequisite_gap: str | None
    mastery_score: int = Field(ge=0, le=100)
    explanation: str
    worked_example: str
    learning_tip: str
    practice_questions: list[str]


class Assessment(BaseModel):
    assessment_id: str
    student_name: str
    score: int
    total: int
    results: list[AnalysisResult]
    focus_result: AnalysisResult
    completed_at: datetime


class Recovery(BaseModel):
    language: Language
    concept: str
    simple_explanation: str
    worked_example: str
    learning_tip: str
    practice_questions: list[str]


class ReassessmentInput(BaseModel):
    answer: str = Field(min_length=1, max_length=100)

    @field_validator("answer")
    @classmethod
    def reassessment_answer_must_not_be_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Answer cannot be blank.")
        return value


class Reassessment(BaseModel):
    is_correct: bool
    resolved: bool
    mastery_before: int
    mastery_after: int
    message: str
    question: str
    options: list[str]
    correct_answer: str
    explanation: str


class ConceptMastery(BaseModel):
    concept: str
    score: int
    needs_attention: bool


class StudentDashboard(BaseModel):
    student_name: str
    overall_mastery: int
    concepts_mastered: int
    concepts_needing_attention: int
    recent_assessment: str
    learning_progress: int
    recommended_recovery: str
    concept_mastery: list[ConceptMastery]


class ConceptWeakness(BaseModel):
    concept: str
    struggling_percent: int


class TeacherStudent(BaseModel):
    name: str
    weak_concept: str
    mastery: int
    intervention_status: str


class TeacherDashboard(BaseModel):
    total_students: int
    average_mastery: int
    students_requiring_intervention: int
    most_difficult_concept: str
    concept_weakness: list[ConceptWeakness]
    ai_teacher_insight: str
    students: list[TeacherStudent]
