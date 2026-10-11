"""Shared pytest fixtures / config.

Disable xdist parallelism for integration tests that share state through
class attributes (CRUD create/update/delete chains).
"""
import pytest


def pytest_collection_modifyitems(config, items):
    # Force sequential execution on single worker by assigning same xdist group.
    for item in items:
        item.add_marker(pytest.mark.xdist_group(name="rangoli_api"))
