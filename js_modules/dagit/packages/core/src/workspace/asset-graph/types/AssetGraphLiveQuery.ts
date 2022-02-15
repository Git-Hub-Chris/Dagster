/* tslint:disable */
/* eslint-disable */
// @generated
// This file was automatically generated and should not be edited.

import { RepositorySelector, AssetKeyInput, RunStatus } from "./../../../types/globalTypes";

// ====================================================
// GraphQL query operation: AssetGraphLiveQuery
// ====================================================

export interface AssetGraphLiveQuery_repositoryOrError_PythonError {
  __typename: "PythonError" | "RepositoryNotFoundError";
}

export interface AssetGraphLiveQuery_repositoryOrError_Repository_inProgressRunsByStep_unstartedRuns {
  __typename: "Run";
  id: string;
}

export interface AssetGraphLiveQuery_repositoryOrError_Repository_inProgressRunsByStep_inProgressRuns {
  __typename: "Run";
  id: string;
}

export interface AssetGraphLiveQuery_repositoryOrError_Repository_inProgressRunsByStep {
  __typename: "InProgressRunsByStep";
  stepKey: string;
  unstartedRuns: AssetGraphLiveQuery_repositoryOrError_Repository_inProgressRunsByStep_unstartedRuns[];
  inProgressRuns: AssetGraphLiveQuery_repositoryOrError_Repository_inProgressRunsByStep_inProgressRuns[];
}

export interface AssetGraphLiveQuery_repositoryOrError_Repository {
  __typename: "Repository";
  id: string;
  name: string;
  inProgressRunsByStep: AssetGraphLiveQuery_repositoryOrError_Repository_inProgressRunsByStep[];
}

export type AssetGraphLiveQuery_repositoryOrError = AssetGraphLiveQuery_repositoryOrError_PythonError | AssetGraphLiveQuery_repositoryOrError_Repository;

export interface AssetGraphLiveQuery_assetNodes_assetMaterializations_runOrError_RunNotFoundError {
  __typename: "RunNotFoundError" | "PythonError";
}

export interface AssetGraphLiveQuery_assetNodes_assetMaterializations_runOrError_Run_repositoryOrigin {
  __typename: "RepositoryOrigin";
  id: string;
  repositoryName: string;
  repositoryLocationName: string;
}

export interface AssetGraphLiveQuery_assetNodes_assetMaterializations_runOrError_Run {
  __typename: "Run";
  id: string;
  runId: string;
  mode: string;
  pipelineName: string;
  pipelineSnapshotId: string | null;
  repositoryOrigin: AssetGraphLiveQuery_assetNodes_assetMaterializations_runOrError_Run_repositoryOrigin | null;
  status: RunStatus;
}

export type AssetGraphLiveQuery_assetNodes_assetMaterializations_runOrError = AssetGraphLiveQuery_assetNodes_assetMaterializations_runOrError_RunNotFoundError | AssetGraphLiveQuery_assetNodes_assetMaterializations_runOrError_Run;

export interface AssetGraphLiveQuery_assetNodes_assetMaterializations_metadataEntries_EventPathMetadataEntry {
  __typename: "EventPathMetadataEntry";
  label: string;
  description: string | null;
  path: string;
}

export interface AssetGraphLiveQuery_assetNodes_assetMaterializations_metadataEntries_EventJsonMetadataEntry {
  __typename: "EventJsonMetadataEntry";
  label: string;
  description: string | null;
  jsonString: string;
}

export interface AssetGraphLiveQuery_assetNodes_assetMaterializations_metadataEntries_EventUrlMetadataEntry {
  __typename: "EventUrlMetadataEntry";
  label: string;
  description: string | null;
  url: string;
}

export interface AssetGraphLiveQuery_assetNodes_assetMaterializations_metadataEntries_EventTextMetadataEntry {
  __typename: "EventTextMetadataEntry";
  label: string;
  description: string | null;
  text: string;
}

export interface AssetGraphLiveQuery_assetNodes_assetMaterializations_metadataEntries_EventMarkdownMetadataEntry {
  __typename: "EventMarkdownMetadataEntry";
  label: string;
  description: string | null;
  mdStr: string;
}

export interface AssetGraphLiveQuery_assetNodes_assetMaterializations_metadataEntries_EventPythonArtifactMetadataEntry {
  __typename: "EventPythonArtifactMetadataEntry";
  label: string;
  description: string | null;
  module: string;
  name: string;
}

export interface AssetGraphLiveQuery_assetNodes_assetMaterializations_metadataEntries_EventFloatMetadataEntry {
  __typename: "EventFloatMetadataEntry";
  label: string;
  description: string | null;
  floatValue: number | null;
}

export interface AssetGraphLiveQuery_assetNodes_assetMaterializations_metadataEntries_EventIntMetadataEntry {
  __typename: "EventIntMetadataEntry";
  label: string;
  description: string | null;
  intValue: number | null;
  intRepr: string;
}

export interface AssetGraphLiveQuery_assetNodes_assetMaterializations_metadataEntries_EventPipelineRunMetadataEntry {
  __typename: "EventPipelineRunMetadataEntry";
  label: string;
  description: string | null;
  runId: string;
}

export interface AssetGraphLiveQuery_assetNodes_assetMaterializations_metadataEntries_EventAssetMetadataEntry_assetKey {
  __typename: "AssetKey";
  path: string[];
}

export interface AssetGraphLiveQuery_assetNodes_assetMaterializations_metadataEntries_EventAssetMetadataEntry {
  __typename: "EventAssetMetadataEntry";
  label: string;
  description: string | null;
  assetKey: AssetGraphLiveQuery_assetNodes_assetMaterializations_metadataEntries_EventAssetMetadataEntry_assetKey;
}

export interface AssetGraphLiveQuery_assetNodes_assetMaterializations_metadataEntries_EventTableMetadataEntry_table_schema_columns_constraints {
  __typename: "TableColumnConstraints";
  nullable: boolean;
  unique: boolean;
  other: string[];
}

export interface AssetGraphLiveQuery_assetNodes_assetMaterializations_metadataEntries_EventTableMetadataEntry_table_schema_columns {
  __typename: "TableColumn";
  name: string;
  description: string | null;
  type: string;
  constraints: AssetGraphLiveQuery_assetNodes_assetMaterializations_metadataEntries_EventTableMetadataEntry_table_schema_columns_constraints;
}

export interface AssetGraphLiveQuery_assetNodes_assetMaterializations_metadataEntries_EventTableMetadataEntry_table_schema_constraints {
  __typename: "TableConstraints";
  other: string[];
}

export interface AssetGraphLiveQuery_assetNodes_assetMaterializations_metadataEntries_EventTableMetadataEntry_table_schema {
  __typename: "TableSchema";
  columns: AssetGraphLiveQuery_assetNodes_assetMaterializations_metadataEntries_EventTableMetadataEntry_table_schema_columns[];
  constraints: AssetGraphLiveQuery_assetNodes_assetMaterializations_metadataEntries_EventTableMetadataEntry_table_schema_constraints | null;
}

export interface AssetGraphLiveQuery_assetNodes_assetMaterializations_metadataEntries_EventTableMetadataEntry_table {
  __typename: "Table";
  records: string[];
  schema: AssetGraphLiveQuery_assetNodes_assetMaterializations_metadataEntries_EventTableMetadataEntry_table_schema;
}

export interface AssetGraphLiveQuery_assetNodes_assetMaterializations_metadataEntries_EventTableMetadataEntry {
  __typename: "EventTableMetadataEntry";
  label: string;
  description: string | null;
  table: AssetGraphLiveQuery_assetNodes_assetMaterializations_metadataEntries_EventTableMetadataEntry_table;
}

export interface AssetGraphLiveQuery_assetNodes_assetMaterializations_metadataEntries_EventTableSchemaMetadataEntry_schema_columns_constraints {
  __typename: "TableColumnConstraints";
  nullable: boolean;
  unique: boolean;
  other: string[];
}

export interface AssetGraphLiveQuery_assetNodes_assetMaterializations_metadataEntries_EventTableSchemaMetadataEntry_schema_columns {
  __typename: "TableColumn";
  name: string;
  description: string | null;
  type: string;
  constraints: AssetGraphLiveQuery_assetNodes_assetMaterializations_metadataEntries_EventTableSchemaMetadataEntry_schema_columns_constraints;
}

export interface AssetGraphLiveQuery_assetNodes_assetMaterializations_metadataEntries_EventTableSchemaMetadataEntry_schema_constraints {
  __typename: "TableConstraints";
  other: string[];
}

export interface AssetGraphLiveQuery_assetNodes_assetMaterializations_metadataEntries_EventTableSchemaMetadataEntry_schema {
  __typename: "TableSchema";
  columns: AssetGraphLiveQuery_assetNodes_assetMaterializations_metadataEntries_EventTableSchemaMetadataEntry_schema_columns[];
  constraints: AssetGraphLiveQuery_assetNodes_assetMaterializations_metadataEntries_EventTableSchemaMetadataEntry_schema_constraints | null;
}

export interface AssetGraphLiveQuery_assetNodes_assetMaterializations_metadataEntries_EventTableSchemaMetadataEntry {
  __typename: "EventTableSchemaMetadataEntry";
  label: string;
  description: string | null;
  schema: AssetGraphLiveQuery_assetNodes_assetMaterializations_metadataEntries_EventTableSchemaMetadataEntry_schema;
}

export type AssetGraphLiveQuery_assetNodes_assetMaterializations_metadataEntries = AssetGraphLiveQuery_assetNodes_assetMaterializations_metadataEntries_EventPathMetadataEntry | AssetGraphLiveQuery_assetNodes_assetMaterializations_metadataEntries_EventJsonMetadataEntry | AssetGraphLiveQuery_assetNodes_assetMaterializations_metadataEntries_EventUrlMetadataEntry | AssetGraphLiveQuery_assetNodes_assetMaterializations_metadataEntries_EventTextMetadataEntry | AssetGraphLiveQuery_assetNodes_assetMaterializations_metadataEntries_EventMarkdownMetadataEntry | AssetGraphLiveQuery_assetNodes_assetMaterializations_metadataEntries_EventPythonArtifactMetadataEntry | AssetGraphLiveQuery_assetNodes_assetMaterializations_metadataEntries_EventFloatMetadataEntry | AssetGraphLiveQuery_assetNodes_assetMaterializations_metadataEntries_EventIntMetadataEntry | AssetGraphLiveQuery_assetNodes_assetMaterializations_metadataEntries_EventPipelineRunMetadataEntry | AssetGraphLiveQuery_assetNodes_assetMaterializations_metadataEntries_EventAssetMetadataEntry | AssetGraphLiveQuery_assetNodes_assetMaterializations_metadataEntries_EventTableMetadataEntry | AssetGraphLiveQuery_assetNodes_assetMaterializations_metadataEntries_EventTableSchemaMetadataEntry;

export interface AssetGraphLiveQuery_assetNodes_assetMaterializations_assetLineage_assetKey {
  __typename: "AssetKey";
  path: string[];
}

export interface AssetGraphLiveQuery_assetNodes_assetMaterializations_assetLineage {
  __typename: "AssetLineageInfo";
  assetKey: AssetGraphLiveQuery_assetNodes_assetMaterializations_assetLineage_assetKey;
  partitions: string[];
}

export interface AssetGraphLiveQuery_assetNodes_assetMaterializations_stepStats {
  __typename: "RunStepStats";
  stepKey: string;
  startTime: number | null;
  endTime: number | null;
}

export interface AssetGraphLiveQuery_assetNodes_assetMaterializations {
  __typename: "MaterializationEvent";
  partition: string | null;
  runOrError: AssetGraphLiveQuery_assetNodes_assetMaterializations_runOrError;
  runId: string;
  timestamp: string;
  stepKey: string | null;
  metadataEntries: AssetGraphLiveQuery_assetNodes_assetMaterializations_metadataEntries[];
  assetLineage: AssetGraphLiveQuery_assetNodes_assetMaterializations_assetLineage[];
  stepStats: AssetGraphLiveQuery_assetNodes_assetMaterializations_stepStats;
}

export interface AssetGraphLiveQuery_assetNodes {
  __typename: "AssetNode";
  id: string;
  opName: string | null;
  assetMaterializations: AssetGraphLiveQuery_assetNodes_assetMaterializations[];
}

export interface AssetGraphLiveQuery {
  repositoryOrError: AssetGraphLiveQuery_repositoryOrError;
  assetNodes: AssetGraphLiveQuery_assetNodes[];
}

export interface AssetGraphLiveQueryVariables {
  repositorySelector: RepositorySelector;
  assetKeys?: AssetKeyInput[] | null;
}
