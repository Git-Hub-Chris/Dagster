/* tslint:disable */
/* eslint-disable */
// @generated
// This file was automatically generated and should not be edited.

// ====================================================
// GraphQL query operation: InstanceHealthQuery
// ====================================================

export interface InstanceHealthQuery_instance_daemonHealth_allDaemonStatuses_lastHeartbeatErrors_errorChain_error {
  __typename: "PythonError";
  message: string;
  stack: string[];
}

export interface InstanceHealthQuery_instance_daemonHealth_allDaemonStatuses_lastHeartbeatErrors_errorChain {
  __typename: "ErrorChainLink";
  isExplicitLink: boolean;
  error: InstanceHealthQuery_instance_daemonHealth_allDaemonStatuses_lastHeartbeatErrors_errorChain_error;
}

export interface InstanceHealthQuery_instance_daemonHealth_allDaemonStatuses_lastHeartbeatErrors {
  __typename: "PythonError";
  message: string;
  stack: string[];
  errorChain: InstanceHealthQuery_instance_daemonHealth_allDaemonStatuses_lastHeartbeatErrors_errorChain[];
}

export interface InstanceHealthQuery_instance_daemonHealth_allDaemonStatuses {
  __typename: "DaemonStatus";
  id: string;
  daemonType: string;
  required: boolean;
  healthy: boolean | null;
  lastHeartbeatErrors: InstanceHealthQuery_instance_daemonHealth_allDaemonStatuses_lastHeartbeatErrors[];
  lastHeartbeatTime: number | null;
}

export interface InstanceHealthQuery_instance_daemonHealth {
  __typename: "DaemonHealth";
  id: string;
  allDaemonStatuses: InstanceHealthQuery_instance_daemonHealth_allDaemonStatuses[];
}

export interface InstanceHealthQuery_instance {
  __typename: "Instance";
  daemonHealth: InstanceHealthQuery_instance_daemonHealth;
  hasInfo: boolean;
}

export interface InstanceHealthQuery {
  instance: InstanceHealthQuery_instance;
}
