from pathlib import Path

from consumption_datamart.common.resources.datawarehouse.sqlite import SQLiteDatawarehouseResource, SQLiteSchema
from dagster import resource, Field


@resource(
    {
        "log_sql": Field(bool, default_value=False, is_required=False, description="Verbose logging of all executed SQL statements"),
    }
)
def inmemory_datawarehouse_resource(init_context):
    base_dir = Path(__file__).parent.parent.parent
    yield SQLiteDatawarehouseResource(
        log_manager=init_context.log_manager,
        echo_sql=init_context.resource_config["log_sql"],
        schemas=[
            SQLiteSchema(
                'acme_lake', f'file:acme_lake?mode=memory',
                init_sql_file=str((base_dir / "consumption_datamart_tests/phase_3/phase_1/acme_lake.sqlite3.sql").resolve())
            ),
            SQLiteSchema(
                'consumption_datamart', f'file:consumption_datamart?mode=memory',
                init_sql_file=str((base_dir / "consumption_datamart_tests/phase_3/phase_1/consumption_datamart.sqlite3.sql").resolve())
            ),
        ]
    )
