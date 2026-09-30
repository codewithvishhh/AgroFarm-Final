"""Spoilage risk placeholder.

Rule based on how far the current temperature sits outside the produce band.
A trained shelf-life model replaces `risk_score` later.
"""

from app.services.alert_service import profile_for


def risk_score(produce_type: str, temperature: float | None) -> dict:
    min_c, max_c, _ = profile_for(produce_type)
    if temperature is None:
        return {"risk": "UNKNOWN", "score": 0.0, "band": [min_c, max_c]}

    if temperature > max_c:
        excess = temperature - max_c
    elif temperature < min_c:
        excess = min_c - temperature
    else:
        excess = 0.0

    score = min(1.0, excess / 8)
    level = "LOW"
    if score > 0.6:
        level = "HIGH"
    elif score > 0.25:
        level = "MEDIUM"

    return {"risk": level, "score": round(score, 2), "band": [min_c, max_c]}
