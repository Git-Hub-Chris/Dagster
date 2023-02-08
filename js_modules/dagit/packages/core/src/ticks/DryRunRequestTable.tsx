import {Box, Icon, Subheading, Table, Tag} from '@dagster-io/ui';
import qs from 'qs';
import React from 'react';

import {RunRequest} from '../graphql/types';
import {PipelineReference} from '../pipelines/PipelineReference';
import {testId} from '../testing/testId';
import {AnchorButton} from '../ui/AnchorButton';
import {useRepository} from '../workspace/WorkspaceContext';
import {RepoAddress} from '../workspace/types';
import {workspacePathFromAddress} from '../workspace/workspacePath';

type Props = {
  name: string;
  runRequests: RunRequest[];
  repoAddress: RepoAddress;
  isJob: boolean;
  jobName: string;
  mode?: string;
};

export const RunRequestTable: React.FC<Props> = ({
  runRequests,
  isJob,
  repoAddress,
  mode,
  jobName,
}) => {
  const repo = useRepository(repoAddress);

  const body = (
    <tbody data-testid={testId('table-body')}>
      {runRequests.map((request, index) => {
        return (
          <tr key={index} data-testid={request.runKey}>
            <td>
              <Box flex={{alignItems: 'center', gap: 8}}>
                <PipelineReference
                  pipelineName={jobName}
                  pipelineHrefContext={repoAddress}
                  isJob={!!repo && isJob}
                  showIcon
                  size="small"
                />
              </Box>
            </td>
            <td>
              <Box flex={{direction: 'row', gap: 8}}>
                {filterTags(request.tags).map(({key, value}) => (
                  <Tag key={key}>
                    {key}: {value}
                  </Tag>
                ))}
              </Box>
            </td>
            <td>
              <AnchorButton
                icon={<Icon name="edit" />}
                target="_blank"
                to={workspacePathFromAddress(
                  repoAddress,
                  `/pipeline_or_job/${jobName}/playground/setup?${qs.stringify({
                    mode,
                    config: request.runConfigYaml,
                  })}`,
                )}
              >
                Open in Launchpad
              </AnchorButton>
            </td>
          </tr>
        );
      })}
    </tbody>
  );
  return (
    <div>
      <Subheading as={Box} margin={{bottom: 12}}>
        Upcoming Ticks
      </Subheading>
      <Table>
        <thead>
          <tr>
            <th>{isJob ? 'Job' : 'Pipeline'} name</th>
            <th>Tags</th>
            <th>Configuration</th>
          </tr>
        </thead>
        {body}
      </Table>
    </div>
  );
};

// Filter out tags we already display in other ways
export function filterTags(tags: Array<{key: string; value: any}>) {
  return tags.filter(({key}) => {
    // Exclude the tag that specifies the schedule if this is a schedule name
    return !['dagster/schedule_name'].includes(key);
  });
}
