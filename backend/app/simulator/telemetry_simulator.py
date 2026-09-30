"""Simulated IoT sensor readings.

Stands in for real temperature and humidity probes inside the truck. Replace
`next_reading` with an MQTT or HTTP ingest when real sensors arrive.
"""

import random

from app.services.alert_service import profile_for


def _drift(value: float, low: float, high: float, step: float) -> float:
    """Random walk that mostly stays in band but can breach it."""
    value += random.uniform(-step, step)
    if value < low:
        value += step * 0.8
    if value > high:
        value -= step * 0.6
    return round(value, 1)


def next_reading(
    produce_type: str, temperature: float | None, humidity: float | None
) -> tuple[float, float]:
    """One new temperature and humidity pair for the produce being carried."""
    min_c, max_c, (min_h, max_h) = profile_for(produce_type)
    current_temperature = (
        temperature if temperature is not None else (min_c + max_c) / 2
    )
    current_humidity = humidity if humidity is not None else (min_h + max_h) / 2

    return (
        _drift(current_temperature, min_c - 2, max_c + 5, 0.6),
        _drift(current_humidity, min_h - 8, max_h + 4, 1.5),
    )
