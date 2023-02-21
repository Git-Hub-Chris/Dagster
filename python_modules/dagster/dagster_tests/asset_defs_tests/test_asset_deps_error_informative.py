import re
import time
from typing import List

import pytest
from dagster import AssetIn, AssetKey, AssetsDefinition, Definitions, asset
from dagster._core.definitions.resolved_asset_deps import resolve_similar_asset_names
from dagster._core.errors import DagsterInvalidDefinitionError


@pytest.mark.parametrize("group_name", [None, "my_group"])
@pytest.mark.parametrize("asset_key_prefix", [[], ["my_prefix"]])
def test_typo_upstream_asset_one_similar(group_name, asset_key_prefix):
    @asset(group_name=group_name, key_prefix=asset_key_prefix)
    def asset1():
        ...

    @asset(
        group_name=group_name,
        key_prefix=asset_key_prefix,
        ins={"asst1": AssetIn(asset_key_prefix + ["asst1"])},
    )
    def asset2(asst1):
        ...

    with pytest.raises(
        DagsterInvalidDefinitionError,
        match=(
            r"Input asset .*\"asst1\".* is not produced by any of the provided asset ops and is"
            r" not one of the provided sources. Did you mean one of the following\?"
            rf"\n\t{re.escape(asset1.asset_key.to_string())}"
        ),
    ):
        Definitions(assets=[asset1, asset2])


def test_typo_upstream_asset_no_similar():
    @asset
    def asset1():
        ...

    @asset
    def asset2(not_close_to_asset1):
        ...

    with pytest.raises(
        DagsterInvalidDefinitionError,
        match=(
            r"Input asset .*\"not_close_to_asset1\".* is not produced by any of the provided asset"
            r" ops and is not one of the provided sources."
        ),
    ):
        Definitions(assets=[asset1, asset2])


def test_typo_upstream_asset_many_similar():
    @asset
    def asset1():
        ...

    @asset
    def assets1():
        ...

    @asset
    def asst():
        ...

    @asset
    def asset2(asst1):
        ...

    with pytest.raises(
        DagsterInvalidDefinitionError,
        match=(
            r"Input asset .*\"asst1\".* is not produced by any of the provided asset ops and is"
            r" not one of the provided sources. Did you mean one of the following\?"
            rf"\n\t{re.escape(asst.asset_key.to_string())},"
            rf" {re.escape(asset1.asset_key.to_string())},"
            rf" {re.escape(assets1.asset_key.to_string())}"
        ),
    ):
        Definitions(assets=[asst, asset1, assets1, asset2])


def test_typo_upstream_asset_wrong_prefix():
    @asset(key_prefix=["my", "prefix"])
    def asset1():
        ...

    @asset(ins={"asset1": AssetIn(key=AssetKey(["my", "prfix", "asset1"]))})
    def asset2(asset1):
        ...

    with pytest.raises(
        DagsterInvalidDefinitionError,
        match=(
            r"Input asset .*\"asset1\".* is not produced by any of the provided asset ops and is"
            r" not one of the provided sources. Did you mean one of the following\?"
            rf"\n\t{re.escape(asset1.asset_key.to_string())}"
        ),
    ):
        Definitions(assets=[asset1, asset2])


def test_typo_upstream_asset_wrong_prefix_and_wrong_key():
    # In the case that the user has a typo in the key and the prefix, we don't suggest the asset since it's too different.

    @asset(key_prefix=["my", "prefix"])
    def asset1():
        ...

    @asset(ins={"asset1": AssetIn(key=AssetKey(["my", "prfix", "asset4"]))})
    def asset2(asset1):
        ...

    with pytest.raises(
        DagsterInvalidDefinitionError,
        match=(
            r"Input asset .*\"asset4\".* is not produced by any of the provided asset ops and is"
            r" not one of the provided sources."
        ),
    ):
        Definitions(assets=[asset1, asset2])


def test_one_off_component_prefix():
    @asset(key_prefix=["my", "prefix"])
    def asset1():
        ...

    # One more component in the prefix
    @asset(ins={"asset1": AssetIn(key=AssetKey(["my", "prefix", "nested", "asset1"]))})
    def asset2(asset1):
        ...

    with pytest.raises(
        DagsterInvalidDefinitionError,
        match=(
            r"Input asset .*\"asset1\".* is not produced by any of the provided asset ops and is"
            r" not one of the provided sources. Did you mean one of the following\?"
            rf"\n\t{re.escape(asset1.asset_key.to_string())}"
        ),
    ):
        Definitions(assets=[asset1, asset2])

    # One fewer component in the prefix
    @asset(ins={"asset1": AssetIn(key=AssetKey(["my", "asset1"]))})
    def asset3(asset1):
        ...

    with pytest.raises(
        DagsterInvalidDefinitionError,
        match=(
            r"Input asset .*\"asset1\".* is not produced by any of the provided asset ops and is"
            r" not one of the provided sources. Did you mean one of the following\?"
            rf"\n\t{re.escape(asset1.asset_key.to_string())}"
        ),
    ):
        Definitions(assets=[asset1, asset3])


NUM_ASSETS_TO_TEST_PERF = 5000
# As of 2/16/2023, `avg_elapsed_time_secs` is ~0.024s on a MBP, ~0.15s on BK
PERF_CUTOFF_SECS = 0.3
NUM_PERF_TRIALS = 10


def test_perf():
    assets: List[AssetsDefinition] = []
    for i in range(NUM_ASSETS_TO_TEST_PERF):

        @asset(name="asset_" + str(i))
        def my_asset():
            ...

        assets.append(my_asset)

    total_elapsed_time_secs = 0
    for _ in range(NUM_PERF_TRIALS):
        start_time = time.time()
        resolve_similar_asset_names(AssetKey("asset_" + str(NUM_ASSETS_TO_TEST_PERF)), assets)
        end_time = time.time()

        elapsed_time_secs = end_time - start_time

        total_elapsed_time_secs += elapsed_time_secs

    avg_elapsed_time_secs = total_elapsed_time_secs / NUM_PERF_TRIALS

    assert (
        avg_elapsed_time_secs < PERF_CUTOFF_SECS
    ), "Performance of resolve_similar_asset_names has regressed"
