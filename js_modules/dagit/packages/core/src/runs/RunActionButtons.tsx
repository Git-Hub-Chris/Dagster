import {Box, Button, Group, Icon} from '@dagster-io/ui';
import * as React from 'react';

import {SharedToaster} from '../app/DomUtils';
import {filterByQuery, GraphQueryItem} from '../app/GraphQueryImpl';
import {DEFAULT_DISABLED_REASON} from '../app/Permissions';
import {LaunchButtonConfiguration, LaunchButtonDropdown} from '../launchpad/LaunchButton';

import {IRunMetadataDict, IStepState} from './RunMetadataProvider';
import {doneStatuses, failedStatuses} from './RunStatuses';
import {DagsterTag} from './RunTag';
import {ReExecutionStyle} from './RunUtils';
import {StepSelection} from './StepSelection';
import {TerminationDialog, TerminationState} from './TerminationDialog';
import {RunFragment, RunPageFragment} from './types/RunFragments.types';
import {useJobAvailabilityErrorForRun} from './useJobAvailabilityErrorForRun';

interface RunActionButtonsProps {
  run: RunPageFragment;
  selection: StepSelection;
  graph: GraphQueryItem[];
  metadata: IRunMetadataDict;
  onLaunch: (style: ReExecutionStyle) => Promise<void>;
}

export const CancelRunButton: React.FC<{run: RunFragment}> = ({run}) => {
  const {id: runId, canTerminate} = run;
  const [showDialog, setShowDialog] = React.useState<boolean>(false);
  const closeDialog = React.useCallback(() => setShowDialog(false), []);

  const onComplete = React.useCallback(
    (terminationState: TerminationState) => {
      const {errors} = terminationState;
      const error = runId && errors[runId];
      if (error && 'message' in error) {
        SharedToaster.show({
          message: error.message,
          icon: 'error',
          intent: 'danger',
        });
      }
    },
    [runId],
  );

  if (!runId) {
    return null;
  }

  return (
    <>
      <Button
        icon={<Icon name="cancel" />}
        intent="danger"
        disabled={showDialog}
        onClick={() => setShowDialog(true)}
      >
        Terminate
      </Button>
      <TerminationDialog
        isOpen={showDialog}
        onClose={closeDialog}
        onComplete={onComplete}
        selectedRuns={{[runId]: canTerminate}}
      />
    </>
  );
};

function stepSelectionWithState(selection: StepSelection, metadata: IRunMetadataDict) {
  const stepStates = selection.keys.map(
    (key) => (key && metadata.steps[key]?.state) || IStepState.PREPARING,
  );

  return {
    ...selection,
    present: selection.keys.length > 0,
    failed: selection.keys.length && stepStates.includes(IStepState.FAILED),
    finished: stepStates.every((stepState) =>
      [IStepState.FAILED, IStepState.SUCCEEDED].includes(stepState),
    ),
  };
}

function stepSelectionFromRunTags(
  run: RunFragment,
  graph: GraphQueryItem[],
  metadata: IRunMetadataDict,
) {
  const tag = run.tags.find((t) => t.key === DagsterTag.StepSelection);
  if (!tag) {
    return null;
  }
  return stepSelectionWithState(
    {keys: filterByQuery(graph, tag.value).all.map((k) => k.name), query: tag.value},
    metadata,
  );
}

export const canRunAllSteps = (run: RunFragment) => doneStatuses.has(run.status);
export const canRunFromFailure = (run: RunFragment) =>
  run.executionPlan && failedStatuses.has(run.status);

export const RunActionButtons: React.FC<RunActionButtonsProps> = (props) => {
  const {metadata, graph, onLaunch, run} = props;
  const artifactsPersisted = run?.executionPlan?.artifactsPersisted;
  const jobError = useJobAvailabilityErrorForRun(run);

  const selection = stepSelectionWithState(props.selection, metadata);

  const currentRunSelection = stepSelectionFromRunTags(run, graph, metadata);
  const currentRunIsFromFailure = run.tags?.some(
    (t) => t.key === DagsterTag.IsResumeRetry && t.value === 'true',
  );

  const full: LaunchButtonConfiguration = {
    icon: 'cached',
    scope: '*',
    title: 'All steps in root run',
    tooltip: 'Re-execute the pipeline run from scratch',
    disabled: !canRunAllSteps(run),
    onClick: () => onLaunch({type: 'all'}),
  };

  const same: LaunchButtonConfiguration = {
    icon: 'linear_scale',
    scope: currentRunSelection?.query || '*',
    title: 'Same steps',
    disabled: !currentRunSelection || !(currentRunSelection.finished || currentRunSelection.failed),
    tooltip: (
      <div>
        {!currentRunSelection || !currentRunSelection.present
          ? 'Re-executes the same step subset used for this run if one was present.'
          : !currentRunSelection.finished
          ? 'Wait for all of the steps to finish to re-execute the same subset.'
          : 'Re-execute the same step subset used for this run:'}
        <StepSelectionDescription selection={currentRunSelection} />
      </div>
    ),
    onClick: () => onLaunch({type: 'selection', selection: currentRunSelection!}),
  };

  const selected: LaunchButtonConfiguration = {
    icon: 'op',
    scope: selection.query,
    title: selection.keys.length > 1 ? 'Selected steps' : 'Selected step',
    disabled: !selection.present || !(selection.finished || selection.failed),
    tooltip: (
      <div>
        {!selection.present
          ? 'Select a step or type a step subset to re-execute.'
          : !selection.finished
          ? 'Wait for the steps to finish to re-execute them.'
          : 'Re-execute the selected steps with existing configuration:'}
        <StepSelectionDescription selection={selection} />
      </div>
    ),
    onClick: () => onLaunch({type: 'selection', selection}),
  };

  const fromSelected: LaunchButtonConfiguration = {
    icon: 'arrow_forward',
    title: 'From selected',
    disabled: !canRunAllSteps(run) || selection.keys.length !== 1,
    tooltip: 'Re-execute the pipeline downstream from the selected steps',
    onClick: () => {
      if (!run.executionPlan) {
        console.warn('Run execution plan must be present to launch from-selected execution');
        return Promise.resolve();
      }
      const selectionAndDownstreamQuery = selection.keys.map((k) => `${k}*`).join(',');
      const selectionKeys = filterByQuery(graph, selectionAndDownstreamQuery).all.map(
        (node) => node.name,
      );

      return onLaunch({
        type: 'selection',
        selection: {
          keys: selectionKeys,
          query: selectionAndDownstreamQuery,
        },
      });
    },
  };

  const fromFailureEnabled = canRunFromFailure(run);

  const fromFailure: LaunchButtonConfiguration = {
    icon: 'arrow_forward',
    title: 'From failure',
    disabled: !fromFailureEnabled,
    tooltip: !fromFailureEnabled
      ? 'Retry is only enabled when the pipeline has failed.'
      : 'Retry the pipeline run, skipping steps that completed successfully',
    onClick: () => onLaunch({type: 'from-failure'}),
  };

  if (!artifactsPersisted) {
    [selected, same, fromFailure, fromSelected].forEach((option) => {
      option.disabled = true;
      option.title =
        'Retry and re-execute are only enabled on persistent storage. Try rerunning with a different storage configuration.';
    });
  }

  const options = [full, same, selected, fromSelected, fromFailure];
  const preferredRerun = selection.present
    ? selected
    : fromFailureEnabled && currentRunIsFromFailure
    ? fromFailure
    : currentRunSelection?.present
    ? same
    : null;

  const primary = artifactsPersisted && preferredRerun ? preferredRerun : full;

  const tooltip = () => {
    if (jobError?.tooltip) {
      return jobError?.tooltip;
    }
    return run.hasReExecutePermission ? undefined : DEFAULT_DISABLED_REASON;
  };

  return (
    <Group direction="row" spacing={8}>
      <Box flex={{direction: 'row'}}>
        <LaunchButtonDropdown
          runCount={1}
          primary={primary}
          options={options}
          title={
            primary.scope === '*'
              ? `Re-execute all (*)`
              : primary.scope
              ? `Re-execute (${primary.scope})`
              : `Re-execute ${primary.title}`
          }
          tooltip={tooltip()}
          icon={jobError?.icon}
          disabled={jobError?.disabled || !run.hasReExecutePermission}
        />
      </Box>
      {!doneStatuses.has(run.status) ? <CancelRunButton run={run} /> : null}
    </Group>
  );
};

const StepSelectionDescription: React.FC<{selection: StepSelection | null}> = ({selection}) => (
  <div style={{paddingLeft: '10px'}}>
    {(selection?.keys || []).map((step) => (
      <span key={step} style={{display: 'block'}}>{`* ${step}`}</span>
    ))}
  </div>
);
