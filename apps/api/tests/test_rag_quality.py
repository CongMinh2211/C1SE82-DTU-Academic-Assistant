import unittest

from evaluation.rag_quality import evaluate_case, evaluate_suite


def base_case(**updates):
    value = {
        "id": "RAG-01",
        "expected_sources": [{"source_id": "guide", "locator": "p.4"}],
        "claims": [],
        "fallback_reason": None,
    }
    value.update(updates)
    return value


def base_trace(**updates):
    value = {
        "id": "RAG-01",
        "retrieved": [{"source_id": "guide", "locator": "p.4"}],
        "citations": [{"source_id": "guide", "locator": "p.4"}],
        "claims": [{"text": "The answer.", "source_ids": ["guide"]}],
        "fallback_reason": None,
    }
    value.update(updates)
    return value


class RagQualityTests(unittest.TestCase):
    def test_exact_citation_and_supported_claim_pass(self):
        result = evaluate_case(base_case(), base_trace())
        self.assertTrue(result["passed"])
        self.assertEqual(result["scores"]["citation_precision"], 1.0)
        self.assertEqual(result["scores"]["citation_recall"], 1.0)

    def test_retrieval_ranking_reports_recall_and_reciprocal_rank(self):
        case = base_case(thresholds={"minimum_reciprocal_rank": 1.0})
        trace = base_trace(retrieved=[
            {"source_id": "irrelevant", "locator": "p.1"},
            {"source_id": "guide", "locator": "p.4"},
        ])
        result = evaluate_case(case, trace)
        self.assertFalse(result["passed"])
        self.assertEqual(result["scores"]["retrieval_recall"], 1.0)
        self.assertEqual(result["scores"]["reciprocal_rank"], 0.5)
        self.assertIn("reciprocal_rank_below_threshold", result["reasons"])

    def test_wrong_page_and_invented_source_fail_citation_checks(self):
        trace = base_trace(citations=[
            {"source_id": "guide", "locator": "p.99"},
            {"source_id": "invented", "locator": "p.1"},
        ])
        result = evaluate_case(base_case(), trace)
        self.assertFalse(result["passed"])
        self.assertIn("citation_not_retrieved", result["reasons"])
        self.assertIn("citation_not_expected", result["reasons"])
        self.assertEqual(result["scores"]["citation_recall"], 0.0)

    def test_claim_without_a_supported_source_fails(self):
        trace = base_trace(claims=[
            {"text": "An unsupported statement.", "source_ids": ["invented"]}
        ])
        result = evaluate_case(base_case(), trace)
        self.assertFalse(result["passed"])
        self.assertIn("unsupported_claim_sources", result["reasons"])

    def test_expected_fallback_passes_only_without_claims_or_citations(self):
        case = base_case(expected_sources=[], fallback_reason="no_evidence")
        good = base_trace(
            retrieved=[],
            citations=[],
            claims=[],
            fallback_reason="no_evidence",
        )
        self.assertTrue(evaluate_case(case, good)["passed"])

        bad = base_trace(
            retrieved=[],
            citations=[],
            claims=[{"text": "Unsupported.", "source_ids": []}],
            fallback_reason="no_evidence",
        )
        self.assertIn(
            "fallback_contains_claims_or_citations",
            evaluate_case(case, bad)["reasons"],
        )

    def test_unexpected_fallback_fails(self):
        result = evaluate_case(
            base_case(),
            base_trace(fallback_reason="provider_unavailable"),
        )
        self.assertFalse(result["passed"])
        self.assertIn("unexpected_fallback", result["reasons"])

    def test_missing_unknown_duplicate_and_empty_suite_inputs_fail(self):
        self.assertFalse(evaluate_suite([], [])["passed"])
        self.assertIn(
            "missing_trace_id",
            evaluate_suite([base_case()], [])["suite_errors"],
        )
        other_case = base_case(id="RAG-02")
        self.assertIn(
            "unknown_trace_id",
            evaluate_suite([other_case], [base_trace()])["suite_errors"],
        )
        cases = [base_case(), base_case()]
        self.assertIn(
            "duplicate_case_id",
            evaluate_suite(cases, [base_trace()])["suite_errors"],
        )


if __name__ == "__main__":
    unittest.main()
