from hacker_news_assets.core import core_assets_local, core_assets_prod, core_assets_staging
from hacker_news_assets.resources import RESOURCES_LOCAL, RESOURCES_PROD, RESOURCES_STAGING
from hacker_news_assets.sensors.hn_tables_updated_sensor import make_hn_tables_updated_sensor

from dagster import AssetGroup

from . import assets

recommender_assets_prod = AssetGroup.from_package_module(
    package_module=assets,
    extra_source_assets=core_assets_prod.to_source_assets(),
    resource_defs=RESOURCES_PROD,
).prefixed("recommender")

recommender_assets_staging = AssetGroup.from_package_module(
    package_module=assets,
    extra_source_assets=core_assets_staging.to_source_assets(),
    resource_defs=RESOURCES_STAGING,
).prefixed("recommender")

recommender_assets_local = AssetGroup.from_package_module(
    package_module=assets,
    extra_source_assets=core_assets_local.to_source_assets(),
    resource_defs=RESOURCES_LOCAL,
).prefixed("recommender")

recommender_assets_sensor_prod = make_hn_tables_updated_sensor(
    recommender_assets_prod.build_job(name="story_recommender_job")
)
recommender_assets_sensor_staging = make_hn_tables_updated_sensor(
    recommender_assets_staging.build_job(name="story_recommender_job")
)
recommender_assets_sensor_local = make_hn_tables_updated_sensor(
    recommender_assets_local.build_job(name="story_recommender_job")
)

recommender_definitions_prod = [recommender_assets_prod, recommender_assets_sensor_prod]
recommender_definitions_staging = [recommender_assets_staging, recommender_assets_sensor_staging]
recommender_definitions_local = [recommender_assets_local, recommender_assets_sensor_local]
