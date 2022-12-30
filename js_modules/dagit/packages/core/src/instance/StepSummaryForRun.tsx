import {useQuery} from '@apollo/client';
import {Colors, Caption} from '@dagster-io/ui';
import qs from 'qs';
import * as React from 'react';
import {Link} from 'react-router-dom';

import {graphql} from '../graphql';
import {failedStatuses, inProgressStatuses} from '../runs/RunStatuses';
import {StepEventStatus} from '../types/globalTypes';

interface Props {
  runId: string;
}

export const StepSummaryForRun = (props: Props) => {
  const {runId} = props;
  const {data} = useQuery(STEP_SUMMARY_FOR_RUN_QUERY, {variables: {runId}});

  const run = data?.pipelineRunOrError;
  const status = run?.__typename === 'Run' ? run.status : null;

  const relevantSteps = React.useMemo(() => {
    if (run?.__typename !== 'Run') {
      return [];
    }

    const {status} = run;
    if (failedStatuses.has(status)) {
      return run.stepStats.filter((step) => step.status === StepEventStatus.FAILURE);
    }

    if (inProgressStatuses.has(status)) {
      return run.stepStats.filter((step) => step.status === StepEventStatus.IN_PROGRESS);
    }

    return [];
  }, [run]);

  const stepCount = relevantSteps.length;

  if (!stepCount || !status) {
    return null;
  }

  if (failedStatuses.has(status)) {
    if (stepCount === 1) {
      const step = relevantSteps[0];
      const query = step.endTime
        ? qs.stringify({focusedTime: Math.floor(step.endTime * 1000)}, {addQueryPrefix: true})
        : '';
      return (
        <Caption color={Colors.Gray500}>
          Failed at <Link to={`/runs/${runId}${query}`}>{step.stepKey}</Link>
        </Caption>
      );
    }
    return (
      <Caption color={Colors.Gray500}>
        Failed at <Link to={`/runs/${runId}`}>{stepCount} steps</Link>
      </Caption>
    );
  }

  if (inProgressStatuses.has(status)) {
    if (stepCount === 1) {
      const step = relevantSteps[0];
      const query = step.endTime
        ? qs.stringify({focusedTime: Math.floor(step.endTime * 1000)}, {addQueryPrefix: true})
        : '';
      return (
        <Caption color={Colors.Gray500}>
          In progress at <Link to={`/runs/${runId}${query}`}>{step.stepKey}</Link>
        </Caption>
      );
    }
    return (
      <Caption color={Colors.Gray500}>
        In progress at <Link to={`/runs/${runId}`}>{stepCount} steps</Link>
      </Caption>
    );
  }

  return null;
};

const STEP_SUMMARY_FOR_RUN_QUERY = graphql(`
  query StepSummaryForRunQuery($runId: ID!) {
    pipelineRunOrError(runId: $runId) {
      ... on Run {
        id
        status
        stepStats {
          endTime
          stepKey
          status
        }
      }
    }
  }
`);
