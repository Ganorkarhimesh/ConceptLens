import tempfile
import unittest
from pathlib import Path

from fastapi.testclient import TestClient

from app import main
from app.services.analysis import DemoAnalysisService
from app.services.data import LocalDataService


class ConceptLensApiTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        backend_dir = Path(__file__).resolve().parents[1]
        self.data_service = LocalDataService(
            data_path=Path(self.temp_dir.name) / "state.json",
            seed_path=backend_dir / "data" / "seed.json",
        )
        self.previous_data_service = main.data_service
        self.previous_analysis_service = main.analysis_service
        main.data_service = self.data_service
        main.analysis_service = DemoAnalysisService(self.data_service)
        self.client = TestClient(main.app)

    def tearDown(self) -> None:
        main.data_service = self.previous_data_service
        main.analysis_service = self.previous_analysis_service
        self.temp_dir.cleanup()

    @staticmethod
    def answers(
        fractions: str = "2/5",
        lcm: str = "18",
        algebra: str = "5",
        percentages: str = "30",
        arithmetic: str = "10",
    ) -> list[dict[str, str]]:
        return [
            {"question_id": "fractions-addition", "answer": fractions},
            {"question_id": "lcm-six-nine", "answer": lcm},
            {"question_id": "solve-linear-equation", "answer": algebra},
            {"question_id": "percentage-of-number", "answer": percentages},
            {"question_id": "order-of-operations", "answer": arithmetic},
        ]

    def create_assessment(self) -> dict:
        response = self.client.post(
            "/api/assessments",
            json={
                "student_name": "Aarav Sharma",
                "answers": self.answers(),
            },
        )
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    def test_health_and_questions_load(self) -> None:
        self.assertEqual(self.client.get("/api/health").json(), {"status": "ok"})
        self.assertEqual(self.client.get("/api/healthz").json(), {"status": "ok"})
        response = self.client.get("/api/questions")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 5)
        self.assertEqual(response.json()[0]["prompt"], "What is 1/2 + 1/3?")

    def test_all_demo_questions_have_answer_pattern_analysis(self) -> None:
        response = self.client.post(
            "/api/assessments",
            json={
                "student_name": "Aarav Sharma",
                "answers": self.answers(
                    fractions="2/5",
                    lcm="54",
                    algebra="25",
                    percentages="120",
                    arithmetic="6",
                ),
            },
        )
        self.assertEqual(response.status_code, 200, response.text)
        results = {result["question_id"]: result for result in response.json()["results"]}
        self.assertEqual(
            results["fractions-addition"]["misconception"],
            "Direct numerator and denominator addition",
        )
        self.assertEqual(
            results["fractions-addition"]["root_cause"],
            "Student is applying whole-number addition logic to fractions.",
        )
        self.assertEqual(
            results["fractions-addition"]["prerequisite_gap"],
            "LCM / Common Denominators",
        )
        for result in results.values():
            self.assertFalse(result["is_correct"])
            self.assertTrue(result["misconception"])
            self.assertTrue(result["root_cause"])
            self.assertGreaterEqual(result["mastery_score"], 0)
        self.assertEqual(response.json()["focus_result"]["mastery_score"], 35)

    def test_assessment_is_stored_and_recovery_supports_three_languages(self) -> None:
        assessment = self.create_assessment()
        assessment_id = assessment["assessment_id"]
        stored = self.client.get(f"/api/assessments/{assessment_id}")
        self.assertEqual(stored.status_code, 200)
        self.assertEqual(stored.json()["focus_result"]["selected_answer"], "2/5")

        english = self.client.get(
            f"/api/assessments/{assessment_id}/recovery/English"
        ).json()
        hindi = self.client.get(
            f"/api/assessments/{assessment_id}/recovery/Hindi"
        ).json()
        marathi = self.client.get(
            f"/api/assessments/{assessment_id}/recovery/Marathi"
        ).json()
        self.assertIn("common denominator", english["simple_explanation"])
        self.assertIn("भिन्नों", hindi["simple_explanation"])
        self.assertIn("अपूर्णांकांची", marathi["simple_explanation"])
        self.assertIn("= 5/6", english["worked_example"])

    def test_reassessment_persists_mastery_and_is_idempotent(self) -> None:
        assessment = self.create_assessment()
        assessment_id = assessment["assessment_id"]
        wrong = self.client.post(
            f"/api/assessments/{assessment_id}/reassess",
            json={"answer": "3/15"},
        )
        self.assertEqual(wrong.status_code, 200, wrong.text)
        self.assertFalse(wrong.json()["resolved"])
        self.assertEqual(wrong.json()["mastery_after"], 35)
        self.assertEqual(wrong.json()["message"].split(".")[0], "Let's try another approach")

        correct = self.client.post(
            f"/api/assessments/{assessment_id}/reassess",
            json={"answer": "1/2"},
        )
        self.assertEqual(correct.status_code, 200, correct.text)
        self.assertTrue(correct.json()["resolved"])
        self.assertEqual(correct.json()["mastery_before"], 35)
        self.assertEqual(correct.json()["mastery_after"], 68)

        repeated = self.client.post(
            f"/api/assessments/{assessment_id}/reassess",
            json={"answer": "1/2"},
        )
        self.assertEqual(repeated.json()["mastery_after"], 68)
        dashboard = self.client.get("/api/student-dashboard").json()
        fractions = next(
            item for item in dashboard["concept_mastery"] if item["concept"] == "Fractions"
        )
        self.assertEqual(fractions["score"], 68)
        self.assertEqual(dashboard["concepts_mastered"], 4)

    def test_teacher_dashboard_uses_sample_class_data(self) -> None:
        response = self.client.get("/api/teacher-dashboard")
        self.assertEqual(response.status_code, 200, response.text)
        data = response.json()
        self.assertEqual(data["total_students"], 10)
        self.assertEqual(data["most_difficult_concept"], "Fractions")
        self.assertEqual(data["students_requiring_intervention"], 4)
        self.assertEqual(len(data["students"]), 10)
        self.assertIn("LCM and common denominators", data["ai_teacher_insight"])

    def test_invalid_assessment_requests_return_422(self) -> None:
        too_few_answers = self.client.post(
            "/api/assessments",
            json={"student_name": "Aarav Sharma", "answers": self.answers()[:4]},
        )
        self.assertEqual(too_few_answers.status_code, 422)

        duplicate_question = self.client.post(
            "/api/assessments",
            json={
                "student_name": "Aarav Sharma",
                "answers": [
                    self.answers()[0],
                    self.answers()[0],
                    *self.answers()[2:],
                ],
            },
        )
        self.assertEqual(duplicate_question.status_code, 422)

        missing_assessment = self.client.get("/api/assessments/not-a-real-id")
        self.assertEqual(missing_assessment.status_code, 404)


if __name__ == "__main__":
    unittest.main()
