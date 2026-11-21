"""Shared Marshmallow fields."""
from marshmallow import fields


class JsonNumber(fields.Float):
    """A float that must arrive as a JSON number (R4.6).

    Marshmallow's Float also accepts numeric strings ("1") and booleans; order values must be real
    numbers, so those are rejected here, along with NaN and infinity (allow_nan=False).
    """

    def __init__(self, **kwargs):
        kwargs.setdefault("allow_nan", False)
        super().__init__(**kwargs)

    def _deserialize(self, value, attr, data, **kwargs):
        if isinstance(value, bool) or not isinstance(value, (int, float)):
            raise self.make_error("invalid")
        return super()._deserialize(value, attr, data, **kwargs)
