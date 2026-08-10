"""drop device_tokens - device storage moved to Supabase

Revision ID: 003_drop_device_tokens
Revises: 002_extend_device_tokens
Create Date: 2026-08-04 20:15:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '003_drop_device_tokens'
down_revision: Union[str, None] = '002_extend_device_tokens'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_index(op.f('ix_device_tokens_is_active'), table_name='device_tokens')
    op.drop_index(op.f('ix_device_tokens_firebase_uid'), table_name='device_tokens')
    op.drop_index(op.f('ix_device_tokens_user_id'), table_name='device_tokens')
    op.drop_index(op.f('ix_device_tokens_fcm_token'), table_name='device_tokens')
    op.drop_index(op.f('ix_device_tokens_device_id'), table_name='device_tokens')
    op.drop_table('device_tokens')


def downgrade() -> None:
    op.create_table(
        'device_tokens',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=100), nullable=True),
        sa.Column('device_id', sa.String(length=150), nullable=False),
        sa.Column('platform', sa.String(length=50), nullable=True),
        sa.Column('app_version', sa.String(length=50), nullable=True),
        sa.Column('fcm_token', sa.String(length=500), nullable=True),
        sa.Column('last_seen', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('firebase_uid', sa.String(length=128), nullable=True),
        sa.Column('device_name', sa.String(length=255), nullable=True),
        sa.Column('manufacturer', sa.String(length=100), nullable=True),
        sa.Column('model', sa.String(length=100), nullable=True),
        sa.Column('os_version', sa.String(length=50), nullable=True),
        sa.Column('notification_enabled', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_device_tokens_device_id'), 'device_tokens', ['device_id'], unique=True)
    op.create_index(op.f('ix_device_tokens_fcm_token'), 'device_tokens', ['fcm_token'], unique=False)
    op.create_index(op.f('ix_device_tokens_user_id'), 'device_tokens', ['user_id'], unique=False)
    op.create_index(op.f('ix_device_tokens_firebase_uid'), 'device_tokens', ['firebase_uid'], unique=False)
    op.create_index(op.f('ix_device_tokens_is_active'), 'device_tokens', ['is_active'], unique=False)
