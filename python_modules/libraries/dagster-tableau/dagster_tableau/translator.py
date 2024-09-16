import re
from enum import Enum
from typing import Any, Mapping

from dagster import _check as check
from dagster._core.definitions.asset_key import AssetKey
from dagster._core.definitions.asset_spec import AssetSpec
from dagster._record import record


def _clean_asset_name(name: str) -> str:
    """Cleans an input to be a valid Dagster asset name."""
    return re.sub(r"[^a-z0-9A-Z.]+", "_", name).lower()


class TableauContentType(Enum):
    """Enum representing each object in Tableau's ontology."""

    WORKBOOK = "workbook"
    VIEW = "view"
    DATA_SOURCE = "data_source"


@record
class TableauContentData:
    """A record representing a piece of content in Tableau.
    Includes the content's type and data as returned from the API.
    """

    content_type: TableauContentType
    properties: Mapping[str, Any]


@record
class TableauWorkspaceData:
    """A record representing all content in a Tableau workspace.
    Provided as context for the translator so that it can resolve dependencies between content.
    """

    site_name: str
    workbooks_by_id: Mapping[str, TableauContentData]
    views_by_id: Mapping[str, TableauContentData]
    data_sources_by_id: Mapping[str, TableauContentData]


class DagsterTableauTranslator:
    """Translator class which converts raw response data from the Tableau API into AssetSpecs.
    Subclass this class to implement custom logic for each type of Tableau content.
    """

    def __init__(self, context: TableauWorkspaceData):
        self._context = context

    @property
    def workspace_data(self) -> TableauWorkspaceData:
        return self._context

    def get_asset_spec(self, data: TableauContentData) -> AssetSpec:
        if data.content_type == TableauContentType.VIEW:
            return self.get_view_spec(data)
        elif data.content_type == TableauContentType.DATA_SOURCE:
            return self.get_data_source_spec(data)
        else:
            check.assert_never(data.content_type)

    def get_view_asset_key(self, data: TableauContentData) -> AssetKey:
        workbook_id = data.properties["workbook"]["luid"]
        workbook_data = self.workspace_data.workbooks_by_id[workbook_id]
        return AssetKey(
            [
                _clean_asset_name(workbook_data.properties["name"]),
                "view",
                _clean_asset_name(data.properties["name"]),
            ]
        )

    def get_view_spec(self, data: TableauContentData) -> AssetSpec:
        view_embedded_data_sources = data.properties.get("parentEmbeddedDatasources", [])
        data_source_ids = {
            published_data_source["luid"]
            for embedded_data_source in view_embedded_data_sources
            for published_data_source in embedded_data_source.get("parentPublishedDatasources", [])
        }

        data_source_keys = [
            self.get_data_source_asset_key(self.workspace_data.data_sources_by_id[data_source_id])
            for data_source_id in data_source_ids
        ]

        return AssetSpec(
            key=self.get_view_asset_key(data),
            deps=data_source_keys if data_source_keys else None,
            tags={"dagster/storage_kind": "tableau"},
        )

    def get_data_source_asset_key(self, data: TableauContentData) -> AssetKey:
        return AssetKey([_clean_asset_name(data.properties["name"])])

    def get_data_source_spec(self, data: TableauContentData) -> AssetSpec:
        return AssetSpec(
            key=self.get_data_source_asset_key(data),
            tags={"dagster/storage_kind": "tableau"},
        )
