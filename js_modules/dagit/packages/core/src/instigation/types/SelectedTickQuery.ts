/* tslint:disable */
/* eslint-disable */
// @generated
// This file was automatically generated and should not be edited.

import { InstigationSelector, InstigationTickStatus } from "./../../types/globalTypes";

// ====================================================
// GraphQL query operation: SelectedTickQuery
// ====================================================

export interface SelectedTickQuery_instigationStateOrError_PythonError {
  __typename: "PythonError";
}

export interface SelectedTickQuery_instigationStateOrError_InstigationState_tick_error_cause {
  __typename: "PythonError";
  message: string;
  stack: string[];
}

export interface SelectedTickQuery_instigationStateOrError_InstigationState_tick_error {
  __typename: "PythonError";
  message: string;
  stack: string[];
  cause: SelectedTickQuery_instigationStateOrError_InstigationState_tick_error_cause | null;
}

export interface SelectedTickQuery_instigationStateOrError_InstigationState_tick {
  __typename: "InstigationTick";
  id: string;
  status: InstigationTickStatus;
  timestamp: number;
  skipReason: string | null;
  runIds: string[];
  originRunIds: string[];
  error: SelectedTickQuery_instigationStateOrError_InstigationState_tick_error | null;
  runKeys: string[];
}

export interface SelectedTickQuery_instigationStateOrError_InstigationState {
  __typename: "InstigationState";
  id: string;
  tick: SelectedTickQuery_instigationStateOrError_InstigationState_tick | null;
}

export type SelectedTickQuery_instigationStateOrError = SelectedTickQuery_instigationStateOrError_PythonError | SelectedTickQuery_instigationStateOrError_InstigationState;

export interface SelectedTickQuery {
  instigationStateOrError: SelectedTickQuery_instigationStateOrError;
}

export interface SelectedTickQueryVariables {
  instigationSelector: InstigationSelector;
  timestamp: number;
}
