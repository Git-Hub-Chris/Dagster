import {gql} from '@apollo/client';
import {Box, Colors, Icon, Caption, Subheading, Mono} from '@dagster-io/ui';
import * as React from 'react';
import {Link} from 'react-router-dom';

import {ASSET_NODE_FRAGMENT, ASSET_NODE_LIVE_FRAGMENT} from '../asset-graph/AssetNode';
import {
  displayNameForAssetKey,
  isSourceAsset,
  LiveData,
  isAssetGroup,
  __ASSET_GROUP_PREFIX,
} from '../asset-graph/Utils';
import {DagsterTypeSummary} from '../dagstertype/DagsterType';
import {Description} from '../pipelines/Description';
import {PipelineReference} from '../pipelines/PipelineReference';
import {buildRepoAddress} from '../workspace/buildRepoAddress';
import {RepoAddress} from '../workspace/types';
import {workspacePathFromAddress} from '../workspace/workspacePath';

import {AssetDefinedInMultipleReposNotice} from './AssetDefinedInMultipleReposNotice';
import {
  AssetMetadataTable,
  ASSET_NODE_OP_METADATA_FRAGMENT,
  metadataForAssetNode,
} from './AssetMetadata';
import {AssetNodeList} from './AssetNodeList';
import {PartitionHealthSummary, usePartitionHealthData} from './PartitionHealthSummary';
import {AssetNodeDefinitionFragment} from './types/AssetNodeDefinitionFragment';

export const AssetNodeDefinition: React.FC<{
  assetNode: AssetNodeDefinitionFragment;
  liveDataByNode: LiveData;
}> = ({assetNode, liveDataByNode}) => {
  const partitionHealthData = usePartitionHealthData([assetNode.assetKey]);
  const {assetMetadata, assetType} = metadataForAssetNode(assetNode);
  const repoAddress = buildRepoAddress(
    assetNode.repository.name,
    assetNode.repository.location.name,
  );

  return (
    <>
      <AssetDefinedInMultipleReposNotice assetId={assetNode.id} loadedFromRepo={repoAddress} />
      <Box flex={{direction: 'row'}}>
        <Box
          style={{flex: 1, minWidth: 0}}
          flex={{direction: 'column'}}
          border={{side: 'right', width: 1, color: Colors.KeylineGray}}
        >
          <Box
            padding={{vertical: 16, horizontal: 24}}
            border={{side: 'bottom', width: 1, color: Colors.KeylineGray}}
            flex={{justifyContent: 'space-between', gap: 8}}
          >
            <Subheading>Description</Subheading>
            <DefinitionLocation assetNode={assetNode} repoAddress={repoAddress} />
          </Box>
          <Box padding={{vertical: 16, horizontal: 24}} style={{flex: 1, minHeight: 120}}>
            <Description
              description={assetNode.description || 'No description provided.'}
              maxHeight={260}
            />
          </Box>
          {assetNode.partitionDefinition && (
            <>
              <Box
                padding={{vertical: 16, horizontal: 24}}
                border={{side: 'horizontal', width: 1, color: Colors.KeylineGray}}
                flex={{justifyContent: 'space-between', gap: 8}}
              >
                <Subheading>Partitions</Subheading>
              </Box>
              <Box
                padding={{top: 16, horizontal: 24, bottom: 24}}
                flex={{direction: 'column', gap: 16}}
              >
                <p>{assetNode.partitionDefinition}</p>
                <PartitionHealthSummary assetKey={assetNode.assetKey} data={partitionHealthData} />
              </Box>
            </>
          )}

          <Box
            padding={{vertical: 16, horizontal: 24}}
            border={{side: 'horizontal', width: 1, color: Colors.KeylineGray}}
            flex={{justifyContent: 'space-between', gap: 8}}
          >
            <Subheading>Upstream Assets ({assetNode.dependencies.length})</Subheading>
          </Box>
          <AssetNodeList items={assetNode.dependencies} liveDataByNode={liveDataByNode} />

          <Box
            padding={{vertical: 16, horizontal: 24}}
            border={{side: 'horizontal', width: 1, color: Colors.KeylineGray}}
            flex={{justifyContent: 'space-between', gap: 8}}
          >
            <Subheading>Downstream Assets ({assetNode.dependedBy.length})</Subheading>
          </Box>
          <AssetNodeList items={assetNode.dependedBy} liveDataByNode={liveDataByNode} />
        </Box>
        <Box style={{flex: 0.5, minWidth: 0}} flex={{direction: 'column'}}>
          <Box
            padding={{vertical: 16, horizontal: 24}}
            border={{side: 'bottom', width: 1, color: Colors.KeylineGray}}
          >
            <Subheading>Type</Subheading>
          </Box>
          {assetType ? (
            <DagsterTypeSummary type={assetType} />
          ) : (
            <Box padding={{vertical: 16, horizontal: 24}}>
              <Description description="No type data provided." />
            </Box>
          )}
          {assetMetadata.length > 0 && (
            <>
              <Box
                padding={{vertical: 16, horizontal: 24}}
                border={{side: 'horizontal', width: 1, color: Colors.KeylineGray}}
                flex={{justifyContent: 'space-between', gap: 8}}
              >
                <Subheading>Metadata</Subheading>
              </Box>
              <Box style={{flex: 1}}>
                <AssetMetadataTable assetMetadata={assetMetadata} />
              </Box>
            </>
          )}
        </Box>
      </Box>
    </>
  );
};

const DefinitionLocation: React.FC<{
  assetNode: AssetNodeDefinitionFragment;
  repoAddress: RepoAddress;
}> = ({assetNode, repoAddress}) => (
  <Box flex={{alignItems: 'baseline', gap: 16, wrap: 'wrap'}} style={{lineHeight: 0}}>
    {assetNode.jobNames
      .filter((jobName) => !isAssetGroup(jobName))
      .map((jobName) => (
        <Mono key={jobName}>
          <PipelineReference
            isJob
            showIcon
            pipelineName={jobName}
            pipelineHrefContext={repoAddress}
          />
        </Mono>
      ))}
    <OpNamesDisplay assetNode={assetNode} repoAddress={repoAddress} />
    {isSourceAsset(assetNode) && (
      <Caption style={{lineHeight: '16px', marginTop: 2}}>Source Asset</Caption>
    )}
  </Box>
);

const OpNamesDisplay = (props: {
  assetNode: AssetNodeDefinitionFragment;
  repoAddress: RepoAddress;
}) => {
  const {assetNode, repoAddress} = props;
  const {assetKey, graphName, opNames} = assetNode;
  const opCount = opNames.length;

  if (!opCount) {
    return null;
  }

  if (!graphName) {
    const firstOp = opNames[0];
    if (displayNameForAssetKey(assetKey) === firstOp) {
      return null;
    }
    const opPath = workspacePathFromAddress(repoAddress, `/ops/${firstOp}`);
    return (
      <Box flex={{gap: 4, alignItems: 'center'}}>
        <Icon name="op" size={16} />
        <Mono>
          <Link to={opPath}>{firstOp}</Link>
        </Mono>
      </Box>
    );
  }

  const graphPath = workspacePathFromAddress(
    repoAddress,
    `/graphs/${__ASSET_GROUP_PREFIX}/${graphName}/`,
  );

  return (
    <Box flex={{gap: 4, alignItems: 'center'}}>
      <Icon name="job" size={16} />
      <Mono>
        <Link to={graphPath}>{graphName}</Link> ({opCount === 1 ? '1 op' : `${opCount} ops`})
      </Mono>
    </Box>
  );
};

export const ASSET_NODE_DEFINITION_FRAGMENT = gql`
  fragment AssetNodeDefinitionFragment on AssetNode {
    id
    description
    graphName
    opNames
    jobNames
    repository {
      id
      name
      location {
        id
        name
      }
    }

    ...AssetNodeFragment
    ...AssetNodeLiveFragment
    ...AssetNodeOpMetadataFragment

    dependencies {
      asset {
        id
        opNames
        jobNames
        ...AssetNodeFragment
        ...AssetNodeLiveFragment
      }
    }
    dependedBy {
      asset {
        id
        opNames
        jobNames
        ...AssetNodeFragment
        ...AssetNodeLiveFragment
      }
    }
  }
  ${ASSET_NODE_FRAGMENT}
  ${ASSET_NODE_LIVE_FRAGMENT}
  ${ASSET_NODE_OP_METADATA_FRAGMENT}
`;
