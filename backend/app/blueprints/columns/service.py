from sqlalchemy import func, select, update

from app.blueprints.columns.schema import ColumnNameSchema, ColumnReorderSchema
from app.common.access import get_column_or_404, require_member
from app.common.errors import AppError
from app.extensions import db
from app.models import Column

ORDER_STEP = 1024.0


def create_column(board_id, user_id, payload) -> Column:
    require_member(board_id, user_id)
    data = ColumnNameSchema().load(payload or {})
    last = db.session.execute(select(func.max(Column.order)).where(Column.board_id == board_id)).scalar()
    column = Column(board_id=board_id, name=data["name"], order=(last or 0) + ORDER_STEP)
    db.session.add(column)
    db.session.commit()
    return column


def rename_column(column_id, user_id, payload) -> Column:
    column = get_column_or_404(column_id)
    require_member(column.board_id, user_id)
    column.name = ColumnNameSchema().load(payload or {})["name"]
    db.session.commit()
    return column


def delete_column(column_id, user_id) -> None:
    column = get_column_or_404(column_id)
    require_member(column.board_id, user_id)
    db.session.delete(column)   # its Cards are removed with it (ondelete=CASCADE)
    db.session.commit()


def reorder_columns(board_id, user_id, payload) -> list[Column]:
    require_member(board_id, user_id)
    data = ColumnReorderSchema().load(payload or {})
    board_column_ids = set(db.session.execute(select(Column.id).where(Column.board_id == board_id)).scalars())
    for item in data["columns"]:
        if item["id"] not in board_column_ids:
            raise AppError("Every column must belong to this board", 400)
    for item in data["columns"]:
        db.session.execute(update(Column).where(Column.id == item["id"]).values(order=item["order"]))
    db.session.commit()
    return db.session.execute(
        select(Column).where(Column.board_id == board_id).order_by(Column.order)
    ).scalars().all()
