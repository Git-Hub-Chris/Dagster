import os

from dagster_dbt import dbt_cli_resource
from dagster_duckdb import build_duckdb_io_manager
from dagster_duckdb_pandas import DuckDBPandasTypeHandler
from tutorial_dbt_dagster import assets
from tutorial_dbt_dagster.assets import DBT_PROFILES, DBT_PROJECT_PATH

from dagster import load_assets_from_package_module, repository, with_resources


@repository
def tutorial_dbt_dagster():
    duckdb_io_manager = build_duckdb_io_manager([DuckDBPandasTypeHandler()])

    return with_resources(
        load_assets_from_package_module(assets),
        {
            "dbt": dbt_cli_resource.configured(
                {
                    "project_dir": DBT_PROJECT_PATH,
                    "profiles_dir": DBT_PROFILES,
                },
            ),
            "io_manager": duckdb_io_manager.configured(
                {"duckdb_path": os.path.join(DBT_PROJECT_PATH, "tutorial.duckdb")}
            ),
        },
    )
