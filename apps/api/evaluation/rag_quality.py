"""Offline quality checks for exported RAG traces.

The evaluator validates reference identity and trace behavior. It does not judge
whether a cited passage semantically entails the answer text.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

DEFAULT_THRESHOLDS = {
    "minimum_retrieval_recall": 1.0,
    "minimum_reciprocal_rank": 1.0,
    "minimum_citation_precision": 1.0,
    "minimum_citation_recall": 1.0,
}


def _references(value: Any) -> tuple[list[tuple[str, str]], int]:
    if not isinstance(value, list):
        return [], int(value not in (None, []))

    references = []
    invalid_count = 0
    for item in value:
        if not isinstance(item, dict):
            invalid_count += 1
            continue
        source_id = item.get("source_id")
        locator = item.get("locator")
        if (
            not isinstance(source_id, str)
            or not source_id.strip()
            or not isinstance(locator, str)
            or not locator.strip()
        ):
            invalid_count += 1
            continue
        references.append((source_id.strip(), locator.strip()))
    return references, invalid_count


def _mean(values: list[float]) -> float | None:
    return sum(values) / len(values) if values else None


def evaluate_case(case: dict[str, Any], trace: dict[str, Any] | None) -> dict[str, Any]:
    case_id = str(case.get("id", ""))
    if trace is None:
        return {"id": case_id, "passed": False, "reasons": ["missing_trace"]}

    reasons: list[str] = []
    expected, invalid_expected = _references(case.get("expected_sources", []))
    retrieved, invalid_retrieved = _references(trace.get("retrieved", []))
    citations, invalid_citations = _references(trace.get("citations", []))
    if invalid_expected:
        reasons.append("invalid_expected_reference")
    if invalid_retrieved:
        reasons.append("invalid_retrieved_reference")
    if invalid_citations:
        reasons.append("invalid_citation_reference")

    expected_set = set(expected)
    retrieved_set = set(retrieved)
    citation_set = set(citations)
    supported_refs = expected_set & retrieved_set & citation_set
    supported_ids = {source_id for source_id, _ in supported_refs}

    if expected_set:
        recall = len(expected_set & retrieved_set) / len(expected_set)
        first_rank = next(
            (
                rank
                for rank, reference in enumerate(retrieved, start=1)
                if reference in expected_set
            ),
            None,
        )
        reciprocal_rank = 1.0 / first_rank if first_rank else 0.0
        precision = (
            sum(
                reference in expected_set and reference in retrieved_set
                for reference in citations
            )
            / len(citations)
            if citations
            else 1.0
        )
        citation_recall = len(expected_set & citation_set) / len(expected_set)
    else:
        recall = reciprocal_rank = precision = citation_recall = 1.0

    if any(reference not in retrieved_set for reference in citations):
        reasons.append("citation_not_retrieved")
    if any(reference not in expected_set for reference in citations):
        reasons.append("citation_not_expected")

    thresholds = dict(DEFAULT_THRESHOLDS)
    supplied_thresholds = case.get("thresholds", {})
    if isinstance(supplied_thresholds, dict):
        thresholds.update(supplied_thresholds)
    scores = {
        "retrieval_recall": recall,
        "reciprocal_rank": reciprocal_rank,
        "citation_precision": precision,
        "citation_recall": citation_recall,
    }
    if expected_set:
        for metric, threshold_name in (
            ("retrieval_recall", "minimum_retrieval_recall"),
            ("reciprocal_rank", "minimum_reciprocal_rank"),
            ("citation_precision", "minimum_citation_precision"),
            ("citation_recall", "minimum_citation_recall"),
        ):
            threshold = thresholds.get(
                threshold_name, DEFAULT_THRESHOLDS[threshold_name]
            )
            if scores[metric] < threshold:
                reasons.append(f"{metric}_below_threshold")

    unsupported_indexes: list[int] = []
    claims_value = trace.get("claims", [])
    if not isinstance(claims_value, list):
        claims = []
        claim_coverage = 0.0
        reasons.append("invalid_claims")
    else:
        claims = claims_value
        supported_claim_count = 0
        invalid_claim = False
        unsupported_claim = False
        for index, claim in enumerate(claims):
            if (
                not isinstance(claim, dict)
                or not isinstance(claim.get("text"), str)
                or not claim["text"].strip()
            ):
                invalid_claim = True
                unsupported_indexes.append(index)
                continue

            source_ids = claim.get("source_ids")
            if (
                not isinstance(source_ids, list)
                or not source_ids
                or any(
                    not isinstance(source_id, str)
                    or source_id not in supported_ids
                    for source_id in source_ids
                )
            ):
                unsupported_claim = True
                unsupported_indexes.append(index)
                continue
            supported_claim_count += 1

        claim_coverage = (
            supported_claim_count / len(claims) if claims else 1.0
        )
        if invalid_claim:
            reasons.append("invalid_claim")
        if unsupported_claim:
            reasons.append("unsupported_claim_sources")

    expected_fallback = case.get("fallback_reason")
    actual_fallback = trace.get("fallback_reason")
    if expected_fallback:
        if actual_fallback != expected_fallback:
            reasons.append("fallback_reason_mismatch")
        if claims or citations:
            reasons.append("fallback_contains_claims_or_citations")
    elif actual_fallback:
        reasons.append("unexpected_fallback")

    scores["claim_source_coverage"] = claim_coverage
    return {
        "id": case_id,
        "passed": not reasons,
        "scores": scores,
        "unsupported_claim_indexes": unsupported_indexes,
        "reasons": reasons,
    }


def evaluate_suite(cases: Any, traces: Any) -> dict[str, Any]:
    errors = []
    if not isinstance(cases, list) or not cases:
        return {
            "passed": False,
            "suite_errors": ["cases_must_be_a_nonempty_list"],
            "cases": [],
        }
    if not isinstance(traces, list):
        return {
            "passed": False,
            "suite_errors": ["traces_must_be_a_list"],
            "cases": [],
        }

    case_ids = []
    for item in cases:
        if (
            not isinstance(item, dict)
            or not isinstance(item.get("id"), str)
            or not item["id"].strip()
        ):
            errors.append("every_case_requires_a_nonempty_string_id")
        else:
            case_ids.append(item["id"])

    trace_ids = []
    for item in traces:
        if (
            not isinstance(item, dict)
            or not isinstance(item.get("id"), str)
            or not item["id"].strip()
        ):
            errors.append("every_trace_requires_a_nonempty_string_id")
        else:
            trace_ids.append(item["id"])

    if len(case_ids) != len(set(case_ids)):
        errors.append("duplicate_case_id")
    if len(trace_ids) != len(set(trace_ids)):
        errors.append("duplicate_trace_id")

    case_id_set = set(case_ids)
    trace_id_set = set(trace_ids)
    if trace_id_set - case_id_set:
        errors.append("unknown_trace_id")
    if case_id_set - trace_id_set:
        errors.append("missing_trace_id")

    trace_by_id = {
        item["id"]: item
        for item in traces
        if isinstance(item, dict) and isinstance(item.get("id"), str)
    }
    evaluated = [
        (case, evaluate_case(case, trace_by_id.get(case.get("id"))))
        for case in cases
        if isinstance(case, dict)
    ]
    answerable_results = [
        result
        for case, result in evaluated
        if _references(case.get("expected_sources", []))[0]
        and result.get("scores")
    ]

    def average(metric: str) -> float | None:
        return _mean(
            [
                result["scores"][metric]
                for result in answerable_results
                if metric in result.get("scores", {})
            ]
        )

    results = [result for _, result in evaluated]
    summary = {
        "case_count": len(results),
        "passed_case_count": sum(result["passed"] for result in results),
        "answerable_case_count": len(answerable_results),
        "mean_retrieval_recall": average("retrieval_recall"),
        "mean_reciprocal_rank": average("reciprocal_rank"),
        "mean_citation_precision": average("citation_precision"),
        "mean_citation_recall": average("citation_recall"),
        "mean_claim_source_coverage": average("claim_source_coverage"),
    }
    return {
        "passed": not errors and all(result["passed"] for result in results),
        "suite_errors": errors,
        "summary": summary,
        "cases": results,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--cases", required=True, type=Path, help="JSON list of expected cases"
    )
    parser.add_argument(
        "--traces", required=True, type=Path, help="JSON list of exported traces"
    )
    args = parser.parse_args()
    try:
        cases = json.loads(args.cases.read_text(encoding="utf-8"))
        traces = json.loads(args.traces.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        print(json.dumps({"passed": False, "error": str(exc)}, ensure_ascii=False))
        return 2

    report = evaluate_suite(cases, traces)
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if report["passed"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
