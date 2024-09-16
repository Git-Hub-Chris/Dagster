import pytest
from dagster_tableau.translator import TableauContentData, TableauContentType, TableauWorkspaceData

SAMPLE_WORKBOOK = {
    "luid": "b75fc023-a7ca-4115-857b-4342028640d0",
    "name": "Test Workbook",
    "createdAt": "2024-09-05T21:33:26Z",
    "updatedAt": "2024-09-13T00:15:27Z",
    "uri": "sites/49445/workbooks/690496",
    "sheets": [
        {
            "luid": "ae8a5f27-8b2f-44e9-aec3-94fe6c638f4f",
        }
    ],
}


SAMPLE_VIEW = {
    "luid": "ae8a5f27-8b2f-44e9-aec3-94fe6c638f4f",
    "name": "Sales",
    "createdAt": "2024-09-05T21:33:26Z",
    "updatedAt": "2024-09-13T00:15:23Z",
    "path": "TestWorkbook/Sales",
    "parentEmbeddedDatasources": [
        {
            "parentPublishedDatasources": [
                {
                    "luid": "0f5660c7-2b05-4ff0-90ce-3199226956c6",
                }
            ]
        }
    ],
    "workbook": {"luid": "b75fc023-a7ca-4115-857b-4342028640d0"},
}


SAMPLE_DATA_SOURCE = {
    "luid": "0f5660c7-2b05-4ff0-90ce-3199226956c6",
    "name": "Superstore Datasource",
}


@pytest.fixture(name="site_name")
def site_name_fixture() -> str:
    return "info-5a38291c26"


@pytest.fixture(
    name="workspace_data",
)
def workspace_data_fixture(site_name: str) -> TableauWorkspaceData:
    return TableauWorkspaceData(
        site_name=site_name,
        workbooks_by_id={
            SAMPLE_WORKBOOK["luid"]: TableauContentData(
                content_type=TableauContentType.WORKBOOK, properties=SAMPLE_WORKBOOK
            )
        },
        views_by_id={
            SAMPLE_VIEW["luid"]: TableauContentData(
                content_type=TableauContentType.VIEW, properties=SAMPLE_VIEW
            )
        },
        data_sources_by_id={
            SAMPLE_DATA_SOURCE["luid"]: TableauContentData(
                content_type=TableauContentType.DATA_SOURCE, properties=SAMPLE_DATA_SOURCE
            )
        },
    )
