"""ETA estimation.

Distance divided by current speed, with a floor so a stopped truck still shows
a number. A learned model replaces `estimate_minutes` later.
"""

from app.services.geo import haversine_km

MIN_SPEED_KMPH = 12.0


def estimate_minutes(
    latitude: float,
    longitude: float,
    destination_latitude: float,
    destination_longitude: float,
    speed_kmph: float,
) -> float:
    remaining_km = haversine_km(
        latitude, longitude, destination_latitude, destination_longitude
    )
    speed = max(speed_kmph, MIN_SPEED_KMPH)
    return round(remaining_km / speed * 60, 1)
