import string

import pytest
from dagster._api.snapshot_partition import (
    sync_get_external_partition_config_grpc,
    sync_get_external_partition_names_grpc,
    sync_get_external_partition_set_execution_param_data_grpc,
    sync_get_external_partition_tags_grpc,
)
from dagster._core.errors import DagsterUserCodeProcessError
from dagster._core.host_representation import (
    ExternalPartitionConfigData,
    ExternalPartitionNamesData,
    ExternalPartitionSetExecutionParamData,
    ExternalPartitionTagsData,
)

from .utils import get_bar_repo_code_location


def test_external_partition_names_grpc(instance):
    with get_bar_repo_code_location(instance) as code_location:
        repository_handle = code_location.get_repository("bar_repo").handle
        data = sync_get_external_partition_names_grpc(
            code_location.client, repository_handle, "baz_partitions"
        )
        assert isinstance(data, ExternalPartitionNamesData)
        assert data.partition_names == list(string.ascii_lowercase)


def test_external_partition_names_error_grpc(instance):
    with get_bar_repo_code_location(instance) as code_location:
        repository_handle = code_location.get_repository("bar_repo").handle

        with pytest.raises(DagsterUserCodeProcessError, match="womp womp"):
            sync_get_external_partition_names_grpc(
                code_location.client,
                repository_handle,
                "error_partitions",
            )


def test_external_partitions_config_grpc(instance):
    with get_bar_repo_code_location(instance) as code_location:
        repository_handle = code_location.get_repository("bar_repo").handle

        data = sync_get_external_partition_config_grpc(
            code_location.client, repository_handle, "baz_partitions", "c", instance
        )
        assert isinstance(data, ExternalPartitionConfigData)
        assert data.run_config
        assert data.run_config["solids"]["do_input"]["inputs"]["x"]["value"] == "c"


def test_external_partitions_config_error_grpc(instance):
    with get_bar_repo_code_location(instance) as code_location:
        repository_handle = code_location.get_repository("bar_repo").handle

        with pytest.raises(DagsterUserCodeProcessError):
            sync_get_external_partition_config_grpc(
                code_location.client,
                repository_handle,
                "error_partition_config",
                "c",
                instance,
            )


def test_external_partitions_tags_grpc(instance):
    with get_bar_repo_code_location(instance) as code_location:
        repository_handle = code_location.get_repository("bar_repo").handle

        data = sync_get_external_partition_tags_grpc(
            code_location.client, repository_handle, "baz_partitions", "c", instance=instance
        )
        assert isinstance(data, ExternalPartitionTagsData)
        assert data.tags
        assert data.tags["foo"] == "bar"


def test_external_partitions_tags_error_grpc(instance):
    with get_bar_repo_code_location(instance) as code_location:
        repository_handle = code_location.get_repository("bar_repo").handle

        with pytest.raises(DagsterUserCodeProcessError):
            sync_get_external_partition_tags_grpc(
                code_location.client, repository_handle, "error_partition_tags", "c", instance
            )


def test_external_partition_set_execution_params_grpc(instance):
    with get_bar_repo_code_location(instance) as code_location:
        repository_handle = code_location.get_repository("bar_repo").handle

        data = sync_get_external_partition_set_execution_param_data_grpc(
            code_location.client,
            repository_handle,
            "baz_partitions",
            ["a", "b", "c"],
            instance=instance,
        )
        assert isinstance(data, ExternalPartitionSetExecutionParamData)
        assert len(data.partition_data) == 3
