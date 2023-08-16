from dagster_external import init_dagster_external

from .util import compute_data_version, load_asset_value, store_asset_value

context = init_dagster_external()
storage_root = context.get_extra("storage_root")
number_y = load_asset_value("number_y", storage_root)
number_x = load_asset_value("number_x", storage_root)
value = number_x + number_y
store_asset_value("number_sum", storage_root, value)

context.log(f"{context.asset_key}: {number_x} + {number_y} = {value}")
context.report_asset_data_version(context.asset_key, compute_data_version(value))
