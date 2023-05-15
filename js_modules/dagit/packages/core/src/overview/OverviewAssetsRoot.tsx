import {useQuery} from '@apollo/client';
import {Box, Spinner, Colors, Icon, Tag, useViewport, Select, MenuItem} from '@dagster-io/ui';
import {useVirtualizer} from '@tanstack/react-virtual';
import * as React from 'react';
import {Link} from 'react-router-dom';
import styled from 'styled-components/macro';

import {PythonErrorInfo} from '../app/PythonErrorInfo';
import {FIFTEEN_SECONDS, useQueryRefreshAtInterval} from '../app/QueryRefresh';
import {useTrackPageView} from '../app/analytics';
import {StatusCase, buildAssetNodeStatusContent} from '../asset-graph/AssetNode';
import {displayNameForAssetKey, toGraphId} from '../asset-graph/Utils';
import {useLiveDataForAssetKeys} from '../asset-graph/useLiveDataForAssetKeys';
import {ASSET_CATALOG_TABLE_QUERY, AssetGroupSuggest} from '../assets/AssetsCatalogTable';
import {assetDetailsPathForKey} from '../assets/assetDetailsPathForKey';
import {
  AssetCatalogTableQuery,
  AssetCatalogTableQueryVariables,
} from '../assets/types/AssetsCatalogTable.types';
import {AssetGroupSelector} from '../graphql/types';
import {useDocumentTitle} from '../hooks/useDocumentTitle';
import {useQueryPersistedState} from '../hooks/useQueryPersistedState';
import {RepositoryLink} from '../nav/RepositoryLink';
import {Container, HeaderCell, Inner, Row, RowCell} from '../ui/VirtualizedTable';
import {buildRepoAddress} from '../workspace/buildRepoAddress';
import {workspacePathFromAddress} from '../workspace/workspacePath';

type Props = {
  Header: React.FC<{refreshState: ReturnType<typeof useQueryRefreshAtInterval>}>;
  TabButton: React.FC<{selected: 'timeline' | 'assets'}>;
};
export const OverviewAssetsRoot = ({Header, TabButton}: Props) => {
  useTrackPageView();
  useDocumentTitle('Overview | Assets');

  const query = useQuery<AssetCatalogTableQuery, AssetCatalogTableQueryVariables>(
    ASSET_CATALOG_TABLE_QUERY,
    {
      notifyOnNetworkStatusChange: true,
    },
  );
  const refreshState = useQueryRefreshAtInterval(query, FIFTEEN_SECONDS);

  const {assets, groupedAssets} = React.useMemo(() => {
    if (query.data?.assetsOrError.__typename === 'AssetConnection') {
      const assets = query.data.assetsOrError.nodes;
      return {assets, groupedAssets: groupAssets(assets)};
    }
    return {assets: [], groupedAssets: []};
  }, [query.data?.assetsOrError]);

  const parentRef = React.useRef<HTMLDivElement | null>(null);

  const rowVirtualizer = useVirtualizer({
    count: groupedAssets.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 82,
    overscan: 5,
  });

  const totalHeight = rowVirtualizer.getTotalSize();
  const items = rowVirtualizer.getVirtualItems();

  function content() {
    const result = query.data?.assetsOrError;
    if (!query.data && query.loading) {
      return (
        <Box
          flex={{alignItems: 'center', justifyContent: 'center', direction: 'column', grow: 1}}
          style={{width: '100%'}}
        >
          <Spinner purpose="page" />
        </Box>
      );
    }
    if (result?.__typename === 'PythonError') {
      return (
        <Box
          flex={{alignItems: 'center', justifyContent: 'center', direction: 'column', grow: 1}}
          style={{width: '100%'}}
        >
          <PythonErrorInfo error={result} />
        </Box>
      );
    }

    return (
      <Box flex={{direction: 'column'}} style={{overflow: 'hidden'}}>
        <Container ref={parentRef}>
          <VirtualHeaderRow />
          <Inner $totalHeight={totalHeight}>
            {items.map(({index, key, size, start}) => {
              const group = groupedAssets[index];
              return <VirtualRow key={key} start={start} height={size} group={group} />;
            })}
          </Inner>
        </Container>
      </Box>
    );
  }

  const [searchGroup, setSearchGroup] = useQueryPersistedState<AssetGroupSelector | null>({
    queryKey: 'g',
    decode: (qs) => (qs.group ? JSON.parse(qs.group) : null),
    encode: (group) => ({group: group ? JSON.stringify(group) : undefined}),
  });

  return (
    <>
      <div style={{position: 'sticky', top: 0, zIndex: 1}}>
        <Header refreshState={refreshState} />
        <Box
          padding={{horizontal: 24, vertical: 16}}
          flex={{alignItems: 'center', gap: 12, grow: 0}}
        >
          <TabButton selected="assets" />
          <AssetGroupSuggest assets={assets} value={searchGroup} onChange={setSearchGroup} />
        </Box>
      </div>
      {content()}
    </>
  );
};

type Assets = Extract<
  AssetCatalogTableQuery['assetsOrError'],
  {__typename: 'AssetConnection'}
>['nodes'];

function groupAssets(assets: Assets) {
  const groups: Record<
    string,
    {
      groupName: string;
      repositoryName: string;
      assets: Assets;
    }
  > = {};

  assets.forEach((asset) => {
    if (!asset.definition) {
      return;
    }
    const groupName = asset.definition.groupName;
    const repositoryName = asset.definition.repository.name;
    const key = `${groupName}||${repositoryName}`;
    groups[key] = groups[key] || {
      groupName,
      repositoryName,
      assets: [],
    };
    groups[key].assets.push(asset);
  });
  return Object.values(groups);
}

const TEMPLATE_COLUMNS = '5fr 1fr 1fr 1fr 1fr';

function VirtualHeaderRow() {
  return (
    <Box
      border={{side: 'horizontal', width: 1, color: Colors.KeylineGray}}
      style={{
        display: 'grid',
        gridTemplateColumns: TEMPLATE_COLUMNS,
        height: '32px',
        fontSize: '12px',
        color: Colors.Gray600,
        position: 'sticky',
        top: 0,
        zIndex: 1,
        background: Colors.White,
      }}
    >
      <HeaderCell>Group name</HeaderCell>
      <HeaderCell>Missing</HeaderCell>
      <HeaderCell>Failed/Overdue</HeaderCell>
      <HeaderCell>In progress</HeaderCell>
      <HeaderCell>Materialized</HeaderCell>
    </Box>
  );
}

type RowProps = {
  height: number;
  start: number;
  group: ReturnType<typeof groupAssets>[0];
};
function VirtualRow({height, start, group}: RowProps) {
  const assetKeys = React.useMemo(() => group.assets.map((asset) => ({path: asset.key.path})), [
    group.assets,
  ]);

  const {liveDataByNode} = useLiveDataForAssetKeys(assetKeys);

  const statuses = React.useMemo(() => {
    type assetType = typeof group['assets'][0];
    const statuses = {
      successful: [] as assetType[],
      failed: [] as assetType[],
      inprogress: [] as assetType[],
      missing: [] as assetType[],
      loading: false,
    };
    if (!Object.keys(liveDataByNode).length) {
      statuses.loading = true;
      return statuses;
    }
    Object.keys(liveDataByNode).forEach((key) => {
      const assetLiveData = liveDataByNode[key];
      const asset = group.assets.find((asset) => toGraphId(asset.key) === key)!;
      if (!asset.definition) {
        console.warn('Expected a definition for asset with key', key);
      }
      const status = buildAssetNodeStatusContent({
        assetKey: {path: JSON.parse(key)},
        definition: asset.definition!,
        liveData: assetLiveData,
        expanded: true,
      });
      switch (status.case) {
        case StatusCase.LOADING:
          statuses.loading = true;
          break;
        case StatusCase.SOURCE_OBSERVING:
          statuses.inprogress.push(asset);
          break;
        case StatusCase.SOURCE_OBSERVED:
          statuses.successful.push(asset);
          break;
        case StatusCase.SOURCE_NEVER_OBSERVED:
          statuses.missing.push(asset);
          break;
        case StatusCase.SOURCE_NO_STATE:
          statuses.missing.push(asset);
          break;
        case StatusCase.MATERIALIZING:
          statuses.inprogress.push(asset);
          break;
        case StatusCase.LATE_OR_FAILED:
          statuses.failed.push(asset);
          break;
        case StatusCase.NEVER_MATERIALIZED:
          statuses.missing.push(asset);
          break;
        case StatusCase.MATERIALIZED:
          statuses.successful.push(asset);
          break;
        case StatusCase.PARTITIONS_FAILED:
          statuses.failed.push(asset);
          break;
        case StatusCase.PARTITIONS_MISSING:
          statuses.missing.push(asset);
          break;
        case StatusCase.PARTITIONS_MATERIALIZED:
          statuses.successful.push(asset);
          break;
      }
    });
    return statuses;
  }, [liveDataByNode, group.assets]);

  const repo = group.assets.find((asset) => asset.definition?.repository)?.definition?.repository;
  const repoAddress = buildRepoAddress(repo?.name || '', repo?.location.name || '');

  const {containerProps, viewport} = useViewport();

  return (
    <Row $height={height} $start={start}>
      <RowGrid border={{side: 'bottom', width: 1, color: Colors.KeylineGray}}>
        <Cell>
          <Box flex={{direction: 'column', gap: 2}}>
            <Box flex={{direction: 'row', gap: 8}}>
              <Icon name="asset_group" />
              <Link
                style={{fontWeight: 700}}
                to={workspacePathFromAddress(repoAddress, `/asset-groups/${group.groupName}`)}
              >
                {group.groupName}
              </Link>
            </Box>
            <div {...containerProps}>
              <RepositoryLinkWrapper maxWidth={viewport.width}>
                <RepositoryLink repoAddress={repoAddress} showRefresh={false} />
              </RepositoryLinkWrapper>
            </div>
          </Box>
        </Cell>
        <Cell isLoading={!!statuses.loading}>
          {statuses.missing.length ? (
            <SelectOnHover assets={statuses.missing}>
              <Tag intent="none">
                <Box flex={{direction: 'row', alignItems: 'center', gap: 6}}>
                  <div
                    style={{
                      width: '12px',
                      height: '12px',
                      border: `2px solid ${Colors.Gray500}`,
                      borderRadius: '50%',
                    }}
                  />
                  {statuses.missing.length}
                </Box>
              </Tag>
            </SelectOnHover>
          ) : (
            0
          )}
        </Cell>
        <Cell isLoading={!!statuses.loading}>
          {statuses.failed.length ? (
            <SelectOnHover assets={statuses.failed}>
              <Tag intent="danger">
                <Box flex={{direction: 'row', alignItems: 'center', gap: 6}}>
                  <div
                    style={{
                      width: 0,
                      height: 0,
                      borderLeft: '6px solid transparent',
                      borderRight: '6px solid transparent',
                      borderBottom: '10px solid red',
                      display: 'inline-block',
                    }}
                  />
                  {statuses.failed.length}
                </Box>
              </Tag>
            </SelectOnHover>
          ) : (
            0
          )}
        </Cell>
        <Cell isLoading={!!statuses.loading}>
          {statuses.inprogress.length ? (
            <SelectOnHover assets={statuses.inprogress}>
              <Tag intent="primary" icon="spinner">
                {statuses.inprogress.length}
              </Tag>
            </SelectOnHover>
          ) : (
            0
          )}
        </Cell>
        <Cell isLoading={!!statuses.loading}>
          {statuses.successful.length ? (
            <SelectOnHover assets={statuses.successful}>
              <Tag intent="success">
                <Box flex={{direction: 'row', alignItems: 'center', gap: 6}}>
                  <div
                    style={{
                      backgroundColor: Colors.Green500,
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                    }}
                  />
                  {statuses.successful.length}
                </Box>
              </Tag>
            </SelectOnHover>
          ) : (
            0
          )}
        </Cell>
      </RowGrid>
    </Row>
  );
}

const RowGrid = styled(Box)`
  display: grid;
  grid-template-columns: ${TEMPLATE_COLUMNS};
  height: 100%;
  > * {
    padding-top: 26px 0px;
  }
`;

const Cell = ({children, isLoading}: {children: React.ReactNode; isLoading?: boolean}) => {
  return (
    <RowCell style={{color: Colors.Gray900}}>
      {isLoading ? (
        <Box flex={{justifyContent: 'center', alignItems: 'center'}} style={{height: '82px'}}>
          <Spinner purpose="body-text" />
        </Box>
      ) : (
        <Box flex={{direction: 'row', alignItems: 'center', grow: 1}}>{children}</Box>
      )}
    </RowCell>
  );
};

const RepositoryLinkWrapper = styled.div<{maxWidth?: number}>`
  font-size: 12px;
  pointer-events: none;
  a {
    color: ${Colors.Gray600};
    pointer-events: none;
    max-width: ${({maxWidth}) => (maxWidth ? 'unset' : `${maxWidth}px`)};
  }
`;

function SelectOnHover({assets, children}: {assets: Assets; children: React.ReactNode}) {
  return (
    <SelectWrapper>
      <Select
        items={assets}
        itemPredicate={(query, item) =>
          displayNameForAssetKey(item.key).toLocaleLowerCase().includes(query.toLocaleLowerCase())
        }
        itemRenderer={(item) => (
          <Link to={assetDetailsPathForKey(item.key)} target="_blank">
            <MenuItem
              key={displayNameForAssetKey(item.key)}
              text={displayNameForAssetKey(item.key)}
              icon="open_in_new"
            />
          </Link>
        )}
        onItemSelect={() => {}}
      >
        {children}
      </Select>
    </SelectWrapper>
  );
}

const SelectWrapper = styled.div`
  cursor: pointer;
  &:hover {
    font-weight: 600;
  }
`;
