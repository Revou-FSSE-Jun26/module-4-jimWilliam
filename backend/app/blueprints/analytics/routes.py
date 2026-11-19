from flask_jwt_extended import jwt_required

from app.blueprints.analytics import bp, service
from app.blueprints.analytics.schema import AnalyticsSchema
from app.common.envelope import ok
from app.common.utils import current_user_id


@bp.get("/boards/<uuid:board_id>/analytics")
@jwt_required()
def board_analytics(board_id):
    return ok(AnalyticsSchema().dump(service.board_analytics(board_id, current_user_id())))
