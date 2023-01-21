import pandas as pd

from dagster import AssetIn, Definitions, asset


def store_pandas_dataframe(*_args, **_kwargs):
    pass


def load_pandas_dataframe(*_args, **_kwargs):
    pass


def load_numpy_array(*_args, **_kwargs):
    pass


pandas_series_io_manager = None

# start_different_input_managers


@asset
def first_asset():
    return [1, 2, 3]


@asset
def second_asset():
    return [4, 5, 6]


@asset(
    ins={
        "first_asset": AssetIn(input_manager_key="pandas_series"),
        "second_asset": AssetIn(input_manager_key="pandas_series"),
    }
)
def third_asset(first_asset, second_asset):
    return pd.concat([first_asset, second_asset, pd.Series([7, 8])])


defs = Definitions(
    assets=[first_asset, second_asset, third_asset],
    resources={
        "pandas_series": pandas_series_io_manager,
    },
)

# end_different_input_managers
