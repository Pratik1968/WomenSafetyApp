"""extend device_tokens for FCM device registration

Revision ID: 002_extend_device_tokens
Revises: 001_initial_tables
Create Date: 2026-08-04 19:45:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '002_extend_device_tokens'
down_revision: Union[str, None] = '001_initial_tables'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('device_tokens') as batch_op:
        batch_op.add_column(sa.Column('firebase_uid', sa.String(length=128), nullable=True))
        batch_op.add_column(sa.Column('device_name', sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column('manufacturer', sa.String(length=100), nullable=True))
        batch_op.add_column(sa.Column('model', sa.String(length=100), nullable=True))
        batch_op.add_column(sa.Column('os_version', sa.String(length=50), nullable=True))
        batch_op.add_column(sa.Column('notification_enabled', sa.Boolean(), nullable=False, server_default=sa.true()))
        batch_op.add_column(sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()))
        batch_op.alter_column('fcm_token', existing_type=sa.String(length=500), nullable=True)
        batch_op.alter_column('last_active', new_column_name='last_seen', existing_type=sa.DateTime())

    op.create_index(op.f('ix_device_tokens_firebase_uid'), 'device_tokens', ['firebase_uid'], unique=False)
    op.create_index(op.f('ix_device_tokens_is_active'), 'device_tokens', ['is_active'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_device_tokens_is_active'), table_name='device_tokens')
    op.drop_index(op.f('ix_device_tokens_firebase_uid'), table_name='device_tokens')

    with op.batch_alter_table('device_tokens') as batch_op:
        batch_op.alter_column('last_seen', new_column_name='last_active', existing_type=sa.DateTime())
        batch_op.alter_column('fcm_token', existing_type=sa.String(length=500), nullable=False)
        batch_op.drop_column('is_active')
        batch_op.drop_column('notification_enabled')
        batch_op.drop_column('os_version')
        batch_op.drop_column('model')
        batch_op.drop_column('manufacturer')
        batch_op.drop_column('device_name')
        batch_op.drop_column('firebase_uid')
