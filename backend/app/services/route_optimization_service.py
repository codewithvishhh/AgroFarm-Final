"""Route optimization placeholder.

The MVP returns a sampled straight line. A routing engine (OSRM, Valhalla) or
an optimizer drops in behind `plan_route` without changing any caller.
"""

from app.services.geo import haversine_km, route_polyline


def plan_route(
    source_latitude: float,
    source_longitude: float,
    destination_latitude: float,
    destination_longitude: float,
) -> dict:
    points = route_polyline(
        source_latitude,
        source_longitude,
        destination_latitude,
        destination_longitude,
    )
    return {
        "distance_km": round(
            haversine_km(
                source_latitude,
                source_longitude,
                destination_latitude,
                destination_longitude,
            ),
            2,
        ),
        "points": [{"latitude": lat, "longitude": lon} for lat, lon in points],
        "method": "straight-line sampling",
    }
