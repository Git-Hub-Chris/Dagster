import {useQuery} from '@apollo/client';
import {Box, Colors, NonIdealState, Subheading} from '@dagster-io/ui';
import * as React from 'react';

import {PythonErrorInfo} from '../app/PythonErrorInfo';
import {useQueryRefreshAtInterval} from '../app/QueryRefresh';
import {useTrackPageView} from '../app/analytics';
import {useDocumentTitle} from '../hooks/useDocumentTitle';
import {UnloadableSchedules} from '../instigation/Unloadable';
import {InstigationType} from '../types/globalTypes';
import {Loading} from '../ui/Loading';
import {repoAddressAsString} from '../workspace/repoAddressAsString';
import {repoAddressToSelector} from '../workspace/repoAddressToSelector';
import {RepoAddress} from '../workspace/types';

import {SCHEDULES_ROOT_QUERY} from './ScheduleUtils';
import {SchedulerInfo} from './SchedulerInfo';
import {SchedulesNextTicks} from './SchedulesNextTicks';
import {SchedulesTable} from './SchedulesTable';
import {SchedulesRootQuery, SchedulesRootQueryVariables} from './types/SchedulesRootQuery';

export const SchedulesRoot = ({repoAddress}: {repoAddress: RepoAddress}) => {
  useTrackPageView();
  useDocumentTitle('Schedules');

  const repositorySelector = repoAddressToSelector(repoAddress);

  const queryResult = useQuery<SchedulesRootQuery, SchedulesRootQueryVariables>(
    SCHEDULES_ROOT_QUERY,
    {
      variables: {
        repositorySelector,
        instigationType: InstigationType.SCHEDULE,
      },
      fetchPolicy: 'cache-and-network',
      partialRefetch: true,
      notifyOnNetworkStatusChange: true,
    },
  );

  useQueryRefreshAtInterval(queryResult, 50 * 1000);

  return (
    <Loading queryResult={queryResult} allowStaleData={true}>
      {(result) => {
        const {repositoryOrError, unloadableInstigationStatesOrError, instance} = result;
        let schedulesSection = null;
        const repoName = repoAddressAsString(repoAddress);

        if (repositoryOrError.__typename === 'PythonError') {
          schedulesSection = <PythonErrorInfo error={repositoryOrError} />;
        } else if (repositoryOrError.__typename === 'RepositoryNotFoundError') {
          schedulesSection = (
            <NonIdealState
              icon="error"
              title="Definitions not found"
              description={`Could not load ${repoName}.`}
            />
          );
        } else if (!repositoryOrError.schedules.length) {
          schedulesSection = (
            <NonIdealState
              icon="schedule"
              title="No schedules found"
              description={
                <p>
                  {repoName} does not have any schedules defined. Visit the{' '}
                  <a href="https://docs.dagster.io/concepts/partitions-schedules-sensors/schedules">
                    scheduler documentation
                  </a>{' '}
                  for more information about scheduling runs in Dagster.
                </p>
              }
            />
          );
        } else {
          schedulesSection = repositoryOrError.schedules.length > 0 && (
            <>
              <SchedulesTable schedules={repositoryOrError.schedules} repoAddress={repoAddress} />
              <Box
                padding={{vertical: 16, horizontal: 24}}
                border={{side: 'bottom', width: 1, color: Colors.Gray100}}
              >
                <Subheading>Scheduled ticks</Subheading>
              </Box>
              <SchedulesNextTicks repos={[repositoryOrError]} />
            </>
          );
        }

        return (
          <>
            <SchedulerInfo
              daemonHealth={instance.daemonHealth}
              padding={{horizontal: 24, vertical: 16}}
            />
            {schedulesSection}
            {unloadableInstigationStatesOrError.__typename === 'PythonError' ? (
              <PythonErrorInfo error={unloadableInstigationStatesOrError} />
            ) : (
              <UnloadableSchedules scheduleStates={unloadableInstigationStatesOrError.results} />
            )}
          </>
        );
      }}
    </Loading>
  );
};
