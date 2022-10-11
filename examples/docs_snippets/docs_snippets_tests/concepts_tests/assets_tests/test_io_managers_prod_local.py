import os
from unittest import mock

from docs_snippets.concepts.assets.asset_io_manager_prod_local import my_repository


@mock.patch.dict(os.environ, {"ENV": "prod"})
def test_prod_assets():
    assert (
        len(
            my_repository._assets_defs_by_key.keys()  # pylint: disable=protected-access
        )
        == 2
    )


@mock.patch.dict(os.environ, {"ENV": "local"})
def test_local_assets():
    assert (
        len(
            my_repository._assets_defs_by_key.keys()  # pylint: disable=protected-access
        )
        == 2
    )
