import pytest
from dagster import (
    AssetKey,
    DagsterInvalidDefinitionError,
    IOManager,
    in_process_executor,
    io_manager,
    mem_io_manager,
    repository,
    resource,
)
from dagster.core.asset_defs import AssetCollection, AssetIn, ForeignAsset, asset


def test_asset_collection_from_list():
    @asset
    def asset_foo():
        return "foo"

    @asset
    def asset_bar():
        return "bar"

    @asset(ins={"asset_bar": AssetIn(asset_key=AssetKey("asset_foo"))})
    def last_asset(asset_bar):
        return asset_bar

    collection = AssetCollection(assets=[asset_foo, asset_bar, last_asset])

    @repository
    def the_repo():
        return [collection]

    assert len(the_repo.get_all_jobs()) == 1
    asset_collection_underlying_job = the_repo.get_all_jobs()[0]
    assert asset_collection_underlying_job.name == collection.all_assets_job_name

    result = asset_collection_underlying_job.execute_in_process()
    assert result.success


def test_asset_collection_foreign_asset():
    foo_fa = ForeignAsset(key=AssetKey("foo"), io_manager_key="the_manager")

    @asset
    def asset_depends_on_source(foo):
        return foo

    class MyIOManager(IOManager):
        def handle_output(self, context, obj):
            pass

        def load_input(self, context):
            return 5

    @io_manager
    def the_manager():
        return MyIOManager()

    collection = AssetCollection(
        assets=[asset_depends_on_source],
        source_assets=[foo_fa],
        resource_defs={"the_manager": the_manager},
    )

    @repository
    def the_repo():
        return [collection]

    asset_collection_underlying_job = the_repo.get_all_jobs()[0]
    assert asset_collection_underlying_job.name == collection.all_assets_job_name

    result = asset_collection_underlying_job.execute_in_process()
    assert result.success


def test_asset_collection_with_resources():
    @asset(required_resource_keys={"foo"})
    def asset_foo(context):
        return context.resources.foo

    @resource
    def the_resource():
        return "foo"

    collection = AssetCollection([asset_foo], resource_defs={"foo": the_resource})

    @repository
    def the_repo():
        return [collection]

    asset_collection_underlying_job = the_repo.get_all_jobs()[0]
    assert asset_collection_underlying_job.name == collection.all_assets_job_name

    result = asset_collection_underlying_job.execute_in_process()
    assert result.success
    assert result.output_for_node("asset_foo") == "foo"


def test_asset_collection_missing_resources():
    @asset(required_resource_keys={"foo"})
    def asset_foo(context):
        return context.resources.foo

    with pytest.raises(
        DagsterInvalidDefinitionError,
        match=r"AssetCollection is missing required resource keys for asset 'asset_foo'. Missing resource keys: \['foo'\]",
    ):
        AssetCollection([asset_foo])

    foreign_asset_io_req = ForeignAsset(key=AssetKey("foo"), io_manager_key="foo")

    with pytest.raises(
        DagsterInvalidDefinitionError,
        match=r"SourceAsset with key AssetKey\(\['foo'\]\) requires io manager with key 'foo', which was not provided on AssetCollection. Provided keys: \['io_manager', 'root_manager'\]",
    ):
        AssetCollection([], source_assets=[foreign_asset_io_req])


def test_asset_collection_with_executor():
    @asset
    def the_asset():
        pass

    @repository
    def the_repo():
        return [AssetCollection([the_asset], executor_def=in_process_executor)]

    asset_collection_underlying_job = the_repo.get_all_jobs()[0]
    assert (
        asset_collection_underlying_job.executor_def  # pylint: disable=comparison-with-callable
        == in_process_executor
    )


def test_asset_collection_requires_root_manager():
    @asset(io_manager_key="blah")
    def asset_foo():
        pass

    with pytest.raises(
        DagsterInvalidDefinitionError,
        match=r"Output 'result' with AssetKey 'AssetKey\(\['asset_foo'\]\)' requires io manager 'blah' but was not provided on asset collection. Provided resources: \['io_manager', 'root_manager'\]",
    ):
        AssetCollection([asset_foo])


def test_resource_override():
    @resource
    def the_resource():
        pass

    with pytest.raises(
        DagsterInvalidDefinitionError,
        match="Resource dictionary included resource with key 'root_manager', which is a reserved resource keyword in Dagster. Please change this key, and then change all places that require this key to a new value.",
    ):
        AssetCollection([], resource_defs={"root_manager": the_resource})

    @repository
    def the_repo():
        return [AssetCollection([], resource_defs={"io_manager": mem_io_manager})]

    asset_collection_underlying_job = the_repo.get_all_jobs()[0]
    assert (  # pylint: disable=comparison-with-callable
        asset_collection_underlying_job.resource_defs["io_manager"] == mem_io_manager
    )
