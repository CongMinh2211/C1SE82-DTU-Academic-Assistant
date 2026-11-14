# Offline RAG quality evaluation

This package evaluates exported RAG traces for retrieval ranking, citation identity, source-reference coverage, and fallback behavior. It uses only the Python standard library.

## Scope

The branch does not expose a chat/RAG API or trace-export adapter. This tool evaluates JSON traces supplied by a future adapter or a manually prepared fixture; it does not call a live assistant. It also cannot judge semantic entailment, so reviewers must compare claims with their cited passages.

## Run

From `apps/api`:

```sh
python -m evaluation.rag_quality --cases evaluation/cases.example.json --traces evaluation/traces.json
```

The command prints per-case results and suite averages. Exit code is 0 if the suite passes, 1 if a case or suite check fails, and 2 if an input file cannot be read or parsed. The averages include answerable cases only; mean reciprocal rank is the arithmetic mean of their per-case reciprocal ranks. `cases.example.json` contains placeholders, not approved DTU facts. Replace its source IDs and locators before using it as a real benchmark.

## Case JSON

The cases file is a JSON array. Each case has:

- `id`: unique case identifier.
- `expected_sources`: required source references, each with exact `source_id` and `locator` (page, section, or stable chunk locator).
- `claims`: reviewer checklist of expected factual claims and their expected source IDs. This is not a semantic gold answer; the evaluator checks trace source references only.
- `fallback_reason`: `null` for answerable cases or an expected reason such as `no_evidence` / `provider_unavailable`.
- `thresholds`: optional per-case minimums. Defaults for answerable cases are 1.0 retrieval recall, reciprocal rank, citation precision, and citation recall.

Example:

```json
[
  {
    "id": "RAG-01",
    "expected_sources": [{"source_id": "handbook-2026", "locator": "page 12"}],
    "claims": [{"claim": "The answer states a handbook fact.", "source_ids": ["handbook-2026"]}],
    "fallback_reason": null
  }
]
```

## Trace JSON

The traces file is a JSON array with one record per case ID:

```json
[
  {
    "id": "RAG-01",
    "retrieved": [{"source_id": "handbook-2026", "locator": "page 12"}],
    "citations": [{"source_id": "handbook-2026", "locator": "page 12"}],
    "claims": [{"text": "Answer claim text.", "source_ids": ["handbook-2026"]}],
    "fallback_reason": null
  }
]
```

Each citation must match an expected source and an exact retrieved source-plus-locator pair. A claim counts as source-covered only if it has non-empty text and its source IDs map to an exact expected, retrieved, and cited reference. The per-case `claim_source_coverage` score is the proportion of covered claims; any invalid or unsupported claim fails the case. For a fallback case, the trace must return the expected fallback reason and have no claims or citations. Missing, extra, duplicate, or malformed trace records fail the suite.

Keep source IDs and locator conventions stable across exports, and record the corpus version alongside each benchmark.
