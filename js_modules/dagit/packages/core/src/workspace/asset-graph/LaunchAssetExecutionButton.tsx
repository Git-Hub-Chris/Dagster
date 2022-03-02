import {ButtonWIP, IconWIP, Tooltip} from '@dagster-io/ui';
import React from 'react';

import {AssetKey} from '../../assets/types';
import {LaunchRootExecutionButton} from '../../launchpad/LaunchRootExecutionButton';
import {buildRepoAddress} from '../buildRepoAddress';

import {LaunchAssetChoosePartitionsDialog} from './LaunchAssetChoosePartitionsDialog';

type AssetMinimal = {
  assetKey: {path: string[]};
  opName: string | null;
  jobNames: string[];
  partitionDefinition: string | null;
  repository: {name: string; location: {name: string}};
};

export const LaunchAssetExecutionButton: React.FC<{
  preferredJobName?: string;
  assets: AssetMinimal[];
  upstreamAssetKeys: AssetKey[];
  title?: string;
}> = ({assets, preferredJobName, upstreamAssetKeys, title}) => {
  const [showingPartitionDialog, setShowingPartitionDialog] = React.useState(false);
  const repoAddress = buildRepoAddress(
    assets[0]?.repository.name || '',
    assets[0]?.repository.location.name || '',
  );

  let disabledReason = '';
  if (!assets.every((a) => a.opName)) {
    disabledReason = 'One or more source assets are selected and cannot be materialized.';
  }
  if (
    !assets.every(
      (a) =>
        a.repository.name === repoAddress.name &&
        a.repository.location.name === repoAddress.location,
    )
  ) {
    disabledReason = 'Assets must be in the same repository to be materialized together.';
  }

  const everyAssetHasJob = (jobName: string) => assets.every((a) => a.jobNames.includes(jobName));
  const jobsInCommon = assets[0] ? assets[0].jobNames.filter(everyAssetHasJob) : [];
  const jobName = jobsInCommon.find((name) => name === preferredJobName) || jobsInCommon[0];
  if (!jobName) {
    disabledReason = 'Assets must be in the same job to be materialized together.';
  }

  const partitionDefinition = assets[0]?.partitionDefinition;
  if (assets.some((a) => a.partitionDefinition !== partitionDefinition)) {
    disabledReason = 'Assets must share a partition definition to be materialized together.';
  }

  title = title || 'Refresh';
  if (partitionDefinition) {
    // Add ellipsis to the button title since it will open a "Choose partitions" modal
    title =
      title.indexOf(' (') !== -1
        ? title.slice(0, title.indexOf(' (')) + '...' + title.slice(title.indexOf(' ('))
        : title + '...';
  }

  return (
    <Tooltip content={disabledReason}>
      {partitionDefinition ? (
        <>
          <ButtonWIP
            icon={<IconWIP name="materialization" />}
            disabled={!!disabledReason}
            intent="primary"
            onClick={() => setShowingPartitionDialog(true)}
          >
            {title}
          </ButtonWIP>
          <LaunchAssetChoosePartitionsDialog
            assets={assets}
            upstreamAssetKeys={upstreamAssetKeys}
            repoAddress={repoAddress}
            assetJobName={jobName}
            open={showingPartitionDialog}
            setOpen={setShowingPartitionDialog}
          />
        </>
      ) : (
        <LaunchRootExecutionButton
          pipelineName={jobName}
          disabled={!!disabledReason}
          title={title}
          icon="materialization"
          getVariables={() => ({
            executionParams: {
              mode: 'default',
              executionMetadata: {},
              runConfigData: {},
              stepKeys: assets.map((o) => o.opName!),
              selector: {
                repositoryLocationName: repoAddress.location,
                repositoryName: repoAddress.name,
                pipelineName: jobName,
              },
            },
          })}
        />
      )}
    </Tooltip>
  );
};
