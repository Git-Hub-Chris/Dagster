import {gql} from '@apollo/client';
import {History} from 'history';
import qs from 'qs';
import * as React from 'react';

import {Mono} from '../../../ui/src';
import {showCustomAlert} from '../app/CustomAlertProvider';
import {SharedToaster} from '../app/DomUtils';
import {PythonErrorInfo} from '../app/PythonErrorInfo';
import {Timestamp} from '../app/time/Timestamp';
import {AssetKey} from '../assets/types';
import {graphql} from '../graphql';
import {ExecutionParams, LaunchPipelineExecutionMutation} from '../graphql/graphql';
import {RunStatus} from '../types/globalTypes';

import {DagsterTag} from './RunTag';
import {StepSelection} from './StepSelection';
import {TimeElapsed} from './TimeElapsed';
import {RunFragment} from './types/RunFragment';
import {RunTableRunFragment} from './types/RunTableRunFragment';
import {RunTimeFragment} from './types/RunTimeFragment';

export function titleForRun(run: {runId: string}) {
  return run.runId.split('-').shift();
}

export function assetKeysForRun(run: {
  assetSelection: {path: string[]}[] | null;
  stepKeysToExecute: string[] | null;
}): AssetKey[] {
  // Note: The fallback logic here is only necessary for Dagit <0.15.0 and should be removed
  // soon, because stepKeysToExecute and asset keys do not map 1:1 for multi-component asset
  // paths.
  return run.assetSelection || run.stepKeysToExecute?.map((s) => ({path: [s]})) || [];
}

export function linkToRunEvent(
  run: {runId: string},
  event: {timestamp?: string; stepKey: string | null},
) {
  return `/runs/${run.runId}?${qs.stringify({
    focusedTime: event.timestamp ? Number(event.timestamp) : undefined,
    selection: event.stepKey,
    logs: `step:${event.stepKey}`,
  })}`;
}

export const RunsQueryRefetchContext = React.createContext<{
  refetch: () => void;
}>({refetch: () => {}});

export function useDidLaunchEvent(cb: () => void, delay = 1500) {
  React.useEffect(() => {
    const handler = () => {
      setTimeout(cb, delay);
    };
    document.addEventListener('run-launched', handler);
    return () => {
      document.removeEventListener('run-launched', handler);
    };
  }, [cb, delay]);
}

export type LaunchBehavior = 'open' | 'open-in-new-tab' | 'toast';

export function handleLaunchResult(
  pipelineName: string,
  result: void | null | LaunchPipelineExecutionMutation['launchPipelineExecution'],
  history: History<unknown>,
  options: {behavior: LaunchBehavior; preserveQuerystring?: boolean},
) {
  if (!result) {
    showCustomAlert({body: `No data was returned. Did Dagit crash?`});
    return;
  }

  if (result.__typename === 'LaunchRunSuccess') {
    const pathname = `/runs/${result.run.runId}`;
    const search = options.preserveQuerystring ? history.location.search : '';
    const openInNewTab = () => window.open(history.createHref({pathname, search}), '_blank');
    const openInSameTab = () => history.push({pathname, search});

    if (options.behavior === 'open-in-new-tab') {
      openInNewTab();
    } else if (options.behavior === 'open') {
      openInSameTab();
    } else {
      SharedToaster.show({
        intent: 'success',
        message: (
          <div>
            Launched run <Mono>{result.run.runId.slice(0, 8)}</Mono>
          </div>
        ),
        action: {
          text: 'View',
          onClick: () => openInNewTab(),
        },
      });
    }
    document.dispatchEvent(new CustomEvent('run-launched'));
  } else if (result.__typename === 'InvalidSubsetError') {
    showCustomAlert({body: result.message});
  } else if (result.__typename === 'PythonError') {
    showCustomAlert({
      title: 'Error',
      body: <PythonErrorInfo error={result} />,
    });
  } else {
    let message = `${pipelineName} cannot be executed with the provided config.`;

    if ('errors' in result) {
      message += ` Please fix the following errors:\n\n${result.errors
        .map((error) => error.message)
        .join('\n\n')}`;
    }

    showCustomAlert({body: message});
  }
}

function getBaseExecutionMetadata(run: RunFragment | RunTableRunFragment) {
  const hiddenTagKeys: string[] = [DagsterTag.IsResumeRetry, DagsterTag.StepSelection];

  return {
    parentRunId: run.runId,
    rootRunId: run.rootRunId ? run.rootRunId : run.runId,
    tags: [
      // Clean up tags related to run grouping once we decide its persistence
      // https://github.com/dagster-io/dagster/issues/2495
      ...run.tags
        .filter((tag) => !hiddenTagKeys.includes(tag.key))
        .map((tag) => ({
          key: tag.key,
          value: tag.value,
        })),
      // pass resume/retry indicator via tags
      // pass run group info via tags
      {
        key: DagsterTag.ParentRunId,
        value: run.runId,
      },
      {
        key: DagsterTag.RootRunId,
        value: run.rootRunId ? run.rootRunId : run.runId,
      },
    ],
  };
}

export type ReExecutionStyle =
  | {type: 'all'}
  | {type: 'from-failure'}
  | {type: 'selection'; selection: StepSelection};

export function getReexecutionVariables(input: {
  run: (RunFragment | RunTableRunFragment) & {runConfigYaml: string};
  style: ReExecutionStyle;
  repositoryLocationName: string;
  repositoryName: string;
}) {
  const {run, style, repositoryLocationName, repositoryName} = input;

  if (!run || !run.pipelineSnapshotId) {
    return undefined;
  }

  const executionParams: ExecutionParams = {
    mode: run.mode,
    runConfigData: run.runConfigYaml,
    executionMetadata: getBaseExecutionMetadata(run),
    selector: {
      repositoryLocationName,
      repositoryName,
      pipelineName: run.pipelineName,
      solidSelection: run.solidSelection,
      assetSelection: run.assetSelection
        ? run.assetSelection.map((asset_key) => ({
            path: asset_key.path,
          }))
        : null,
    },
  };

  if (style.type === 'from-failure') {
    executionParams.executionMetadata?.tags?.push({
      key: DagsterTag.IsResumeRetry,
      value: 'true',
    });
  }
  if (style.type === 'selection') {
    executionParams.stepKeys = style.selection.keys;
    executionParams.executionMetadata?.tags?.push({
      key: DagsterTag.StepSelection,
      value: style.selection.query,
    });
  }
  return {executionParams};
}

export const LAUNCH_PIPELINE_EXECUTION_MUTATION = graphql(`
  mutation LaunchPipelineExecution($executionParams: ExecutionParams!) {
    launchPipelineExecution(executionParams: $executionParams) {
      __typename
      ... on LaunchRunSuccess {
        run {
          id
          runId
          pipelineName
        }
      }
      ... on PipelineNotFoundError {
        message
      }
      ... on InvalidSubsetError {
        message
      }
      ... on RunConfigValidationInvalid {
        errors {
          message
        }
      }
      ...PythonErrorFragment
    }
  }
`);

export const DELETE_MUTATION = graphql(`
  mutation Delete($runId: String!) {
    deletePipelineRun(runId: $runId) {
      __typename
      ...PythonErrorFragment
      ... on UnauthorizedError {
        message
      }
      ... on RunNotFoundError {
        message
      }
    }
  }
`);

export const TERMINATE_MUTATION = graphql(`
  mutation Terminate($runId: String!, $terminatePolicy: TerminateRunPolicy) {
    terminatePipelineExecution(runId: $runId, terminatePolicy: $terminatePolicy) {
      __typename
      ... on TerminateRunFailure {
        message
      }
      ... on RunNotFoundError {
        message
      }
      ... on TerminateRunSuccess {
        run {
          id
          runId
          canTerminate
        }
      }
      ... on UnauthorizedError {
        message
      }
      ...PythonErrorFragment
    }
  }
`);

export const LAUNCH_PIPELINE_REEXECUTION_MUTATION = graphql(`
  mutation LaunchPipelineReexecution(
    $executionParams: ExecutionParams
    $reexecutionParams: ReexecutionParams
  ) {
    launchPipelineReexecution(
      executionParams: $executionParams
      reexecutionParams: $reexecutionParams
    ) {
      __typename
      ... on LaunchRunSuccess {
        run {
          id
          runId
          pipelineName
          rootRunId
          parentRunId
        }
      }
      ... on PipelineNotFoundError {
        message
      }
      ... on InvalidSubsetError {
        message
      }
      ... on RunConfigValidationInvalid {
        errors {
          message
        }
      }
      ...PythonErrorFragment
    }
  }
`);

interface RunTimeProps {
  run: RunTimeFragment;
}

export const RunTime: React.FC<RunTimeProps> = React.memo(({run}) => {
  const {startTime, updateTime} = run;

  return (
    <div>
      {startTime ? (
        <Timestamp timestamp={{unix: startTime}} />
      ) : updateTime ? (
        <Timestamp timestamp={{unix: updateTime}} />
      ) : null}
    </div>
  );
});

export const RunStateSummary: React.FC<RunTimeProps> = React.memo(({run}) => {
  // kind of a hack, but we manually set the start time to the end time in the graphql resolver
  // for this case, so check for start/end time equality for the failed to start condition
  const failedToStart =
    run.status === RunStatus.FAILURE && (!run.startTime || run.startTime === run.endTime);

  return failedToStart ? (
    <div>Failed to start</div>
  ) : run.status === RunStatus.CANCELED ? (
    <div>Canceled</div>
  ) : run.status === RunStatus.CANCELING ? (
    <div>Canceling…</div>
  ) : run.status === RunStatus.QUEUED ? (
    <div>Queued…</div>
  ) : !run.startTime ? (
    <div>Starting…</div>
  ) : (
    <TimeElapsed startUnix={run.startTime} endUnix={run.endTime} />
  );
});

export const RUN_TIME_FRAGMENT = gql`
  fragment RunTimeFragment on Run {
    id
    runId
    status
    startTime
    endTime
    updateTime
  }
`;
