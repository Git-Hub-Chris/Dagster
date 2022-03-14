import {gql, useQuery} from '@apollo/client';
import {ColorsWIP, IconWIP} from '@dagster-io/ui';
import * as React from 'react';

import {INSTANCE_HEALTH_FRAGMENT} from '../instance/InstanceHealthFragment';
import {useRepositoryOptions} from '../workspace/WorkspaceContext';

import {WarningTooltip} from './WarningTooltip';
import {InstanceWarningQuery} from './types/InstanceWarningQuery';

export const InstanceWarningIcon = React.memo(() => {
  const {options} = useRepositoryOptions();
  const {data: healthData} = useQuery<InstanceWarningQuery>(INSTANCE_WARNING_QUERY, {
    fetchPolicy: 'cache-and-network',
    pollInterval: 15 * 1000,
  });

  const {anySchedules, anySensors} = React.useMemo(() => {
    let anySchedules = false;
    let anySensors = false;

    // Find any schedules or sensors in the repo list.
    for (const repo of options) {
      if (repo.repository.sensors.some((s) => s.sensorState.status === 'RUNNING')) {
        anySensors = true;
        break;
      }
    }
    for (const repo of options) {
      if (repo.repository.schedules.some((s) => s.scheduleState.status === 'RUNNING')) {
        anySchedules = true;
        break;
      }
    }

    return {anySchedules, anySensors};
  }, [options]);

  const allDaemons = healthData?.instance.daemonHealth.allDaemonStatuses;
  const anyRequestedBackfills =
    healthData?.partitionBackfillsOrError.__typename === 'PartitionBackfills'
      ? healthData.partitionBackfillsOrError.results.length > 0
      : false;

  const visibleErrorCount = React.useMemo(() => {
    if (!allDaemons) {
      return 0;
    }

    const errors = allDaemons
      .filter((daemon) => !daemon.healthy && daemon.required)
      .reduce((accum, daemon) => accum.add(daemon.daemonType), new Set<string>());

    const totalErrorCount = errors.size;
    const scheduleError = anySchedules && errors.has('SCHEDULER');
    const sensorError = anySensors && errors.has('SENSOR');
    const backfillsError = anyRequestedBackfills && errors.has('BACKFILL');

    errors.delete('SCHEDULER');
    errors.delete('SENSOR');
    errors.delete('BACKFILL');

    // If there are any errors besides scheduler/sensor/backfill, show the entire count.
    if (errors.size) {
      return totalErrorCount;
    }

    // Otherwise, just show the number that is relevant to the user's workspace.
    // - If there are no schedules or sensors, this will be zero.
    // - If there is a sensor daemon error but there are no sensors, this will be zero.
    // - If there is a backfill daemon error but there are no backfills, this will be zero.
    return Number(scheduleError) + Number(sensorError) + Number(backfillsError);
  }, [anySchedules, anySensors, anyRequestedBackfills, allDaemons]);

  if (visibleErrorCount) {
    return (
      <WarningTooltip
        content={
          <div>{`${visibleErrorCount} ${
            visibleErrorCount === 1 ? 'daemon not running' : 'daemons not running'
          }`}</div>
        }
        position="bottom"
        modifiers={{offset: {enabled: true, options: {offset: [0, 28]}}}}
      >
        <IconWIP name="warning" color={ColorsWIP.Yellow500} />
      </WarningTooltip>
    );
  }

  return null;
});

const INSTANCE_WARNING_QUERY = gql`
  query InstanceWarningQuery {
    instance {
      ...InstanceHealthFragment
    }
    partitionBackfillsOrError(status: REQUESTED) {
      __typename
      ... on PartitionBackfills {
        results {
          backfillId
        }
      }
    }
  }
  ${INSTANCE_HEALTH_FRAGMENT}
`;
