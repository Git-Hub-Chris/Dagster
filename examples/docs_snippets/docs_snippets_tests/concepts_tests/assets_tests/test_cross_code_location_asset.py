from docs_snippets.concepts.assets.cross_cl_code_location_1 import (
    defs as code_location_1_defs,
)
from docs_snippets.concepts.assets.cross_cl_code_location_2 import (
    defs as code_location_2_defs,
)


def test_repository_asset_groups():
    assert (
        code_location_1_defs.get_implicit_global_asset_job_def()
        .execute_in_process()
        .success
    )
    assert (
        code_location_2_defs.get_implicit_global_asset_job_def()
        .execute_in_process()
        .success
    )
