from typing import Sequence, Union

from dagster import AssetsDefinition, AssetSpec
from dagster._core.definitions.asset_key import CoercibleToAssetKey
from dagster._core.definitions.definitions_class import Definitions
from typing_extensions import TypeAlias

from .utils import DAG_ID_TAG, TASK_ID_TAG

CoercibleToAssetSpec: TypeAlias = Union[AssetSpec, CoercibleToAssetKey]


def specs_from_task(
    *, task_id: str, dag_id: str, assets: Sequence[CoercibleToAssetSpec]
) -> Sequence[AssetSpec]:
    """Construct a Dagster :py:class:`Definitions` object from a provided set of assets,
    with a mapping to which airflow task produces those assets.
    """
    return [
        asset
        if isinstance(asset, AssetSpec)
        else AssetSpec(key=asset, tags={DAG_ID_TAG: dag_id, TASK_ID_TAG: task_id})
        for asset in assets
    ]


def combine_defs(*defs: Union[AssetsDefinition, Definitions, AssetSpec]) -> Definitions:
    """Combine provided :py:class:`Definitions` objects and assets into a single object, which contains all constituent definitions."""
    assets = []
    for _def in defs:
        if isinstance(_def, Definitions):
            continue
        elif isinstance(_def, AssetsDefinition):
            assets.append(_def)
        elif isinstance(_def, AssetSpec):
            assets.append(_def)
        else:
            raise Exception(f"Unexpected type: {type(_def)}")

    return Definitions.merge(
        *[the_def for the_def in defs if isinstance(the_def, Definitions)],
        Definitions(assets=assets),
    )
