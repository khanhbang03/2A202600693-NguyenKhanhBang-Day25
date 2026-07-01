from __future__ import annotations

import argparse
import json
from pathlib import Path


def _met(value: float | None, op: str, target: float) -> str:
    if value is None:
        return "n/a"
    if op == ">=":
        return "yes" if value >= target else "no"
    return "yes" if value < target else "no"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--metrics", default="reports/metrics.json")
    parser.add_argument("--out", default="reports/final_report.md")
    args = parser.parse_args()
    metrics = json.loads(Path(args.metrics).read_text())
    recovery = metrics.get("recovery_time_ms")
    recovery_display = "n/a" if recovery is None else recovery
    lines = [
        "# Day 10 Reliability Final Report",
        "",
        "## Architecture Summary",
        "",
        "Requests enter the gateway, check the response cache first, then flow through ordered providers guarded by per-provider circuit breakers. If every provider is unavailable, the gateway returns a static degraded-service response instead of surfacing raw provider failures.",
        "",
        "```",
        "User request",
        "  -> semantic/privacy-aware cache",
        "  -> primary provider circuit breaker",
        "  -> backup provider circuit breaker",
        "  -> static fallback",
        "```",
        "",
        "## Metrics Summary",
        "",
        "| Metric | Value |",
        "|---|---:|",
    ]
    for key, value in metrics.items():
        if key == "scenarios":
            continue
        lines.append(f"| {key} | {value} |")
    lines += ["", "## Chaos Scenarios", "", "| Scenario | Status |", "|---|---|"]
    for key, value in metrics.get("scenarios", {}).items():
        lines.append(f"| {key} | {value} |")
    lines += [
        "",
        "## SLO Check",
        "",
        "| SLI | Target | Actual | Met? |",
        "|---|---:|---:|---|",
        f"| Availability | >= 0.99 | {metrics.get('availability')} | {_met(metrics.get('availability'), '>=', 0.99)} |",
        f"| Latency P95 ms | < 2500 | {metrics.get('latency_p95_ms')} | {_met(metrics.get('latency_p95_ms'), '<', 2500)} |",
        f"| Fallback success rate | >= 0.95 | {metrics.get('fallback_success_rate')} | {_met(metrics.get('fallback_success_rate'), '>=', 0.95)} |",
        f"| Cache hit rate | >= 0.10 | {metrics.get('cache_hit_rate')} | {_met(metrics.get('cache_hit_rate'), '>=', 0.10)} |",
        f"| Recovery time ms | < 5000 | {recovery_display} | {_met(recovery, '<', 5000)} |",
        "",
        "## Redis Shared Cache",
        "",
        "The in-memory cache is process-local, so multiple gateway instances would each learn different cache entries and lose them on restart. `SharedRedisCache` stores query hashes, original queries, responses, and TTLs in Redis so separate gateway instances can share cache hits while preserving the same privacy and false-hit guardrails.",
        "",
        "Redis tests should be run with `docker compose up -d` before `pytest tests/test_redis_cache.py -v`.",
        "",
        "## Failure Analysis",
        "",
        "The main remaining production weakness is that circuit breaker state is still local to each gateway process. In a scaled deployment, one instance could keep sending traffic to a failing provider while another has already opened its circuit. A production version should share breaker state or use provider-health telemetry across instances.",
        "",
        "## Next Steps",
        "",
        "1. Share circuit breaker state or health decisions across gateway replicas.",
        "2. Add per-tenant privacy and rate-limit policies before cache lookup.",
        "3. Add provider quality scoring so fallback routing considers answer quality, not only availability.",
    ]
    Path(args.out).parent.mkdir(parents=True, exist_ok=True)
    Path(args.out).write_text("\n".join(lines))
    print(f"wrote {args.out}")


if __name__ == "__main__":
    main()
