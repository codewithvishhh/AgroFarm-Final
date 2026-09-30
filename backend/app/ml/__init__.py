"""Reserved for the AI/ML layer.

Nothing here is implemented for the MVP. Planned modules:

- eta_predictor.py      : predicted arrival time from telemetry and traffic
- spoilage_predictor.py : remaining shelf life from the temperature history
- route_optimizer.py    : multi-stop routing and load consolidation

Each will expose one pure function called from the service layer, so the API
and the frontend need no change when they land.
"""


def predict_eta(*_args, **_kwargs):
    raise NotImplementedError("ETA model is not part of the MVP")


def predict_spoilage_risk(*_args, **_kwargs):
    raise NotImplementedError("Spoilage model is not part of the MVP")


def optimize_routes(*_args, **_kwargs):
    raise NotImplementedError("Route optimizer is not part of the MVP")
