# Offline RAG quality evaluation

This package evaluates exported RAG traces for retrieval ranking, citation identity, source-reference coverage, and fallback behavior. It uses only the Python standard library.

## Important scope

The target branch currently has no chat/RAG API or trace-export adapter. This tool does not call a live assistant. It evaluates JSON traces supplied by a future API adapter or a manually prepared fixture. It cannot determine whether a passage semantically entails a claim; reviewers must inspect the answer and cited passage.

## Run

From `apps/api`:

```sh
python -m evaluation.rag_quality --cases evaluation/cases.example.json --traces evaluation/traces.json
```

The command prints a JSON report. Exit code is 0 if the suite passes, 1 if any case or suite check fails, and 2 if an input file cannot be read or parsed. `cases.example.json` contains placeholders, not approved DTU facts; replace all source IDs and locators before using it as a real benchmark.

## Case JSON

The cases file is a JSON array. Each case has:

- `id`: unique case identifier.
- `expected_sources`: required source references, each with exact `source_id` and `locator` (page, section, or stable chunk locator).
- `claims`: review checklist describing expected factual claims and the source IDs expected to support them. This is documentation for reviewers; the evaluator checks the trace's claim references, not semantic similarity to this checklist.
- `fallback_reason`: `null` for answerable cases or the expected reason such as `no_evidence` / `provider_unavailable`.
- `thresholds`: optional per-case minimums. Defaults for answerable cases are 1.0 retrieval recall, 1.0 reciprocal rank, 1.0 citation precision, and 1.0 citation recall.

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

Each citation must match an expected source and an exact retrieved source-plus-locator pair. Claim source IDs must map to at least one exact expected, retrieved, and cited reference. For a fallback case, the trace must return the expected fallback reason and have no factual claims or citations. Missing, extra, duplicate, or malformed trace records fail the suite.

Use traces captured from a controlled test dataset. Keep source IDs and locator conventions stable across exports, and record the corpus version alongside the benchmark when the integration is implemented.
