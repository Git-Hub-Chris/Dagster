import {gql, useQuery} from '@apollo/client';
import {Box, Page, Spinner} from '@dagster-io/ui';
import * as React from 'react';
import {useHistory} from 'react-router';
import {useParams} from 'react-router-dom';

import {useTrackPageView} from '../app/analytics';
import {displayNameForAssetKey} from '../asset-graph/Utils';
import {useDocumentTitle} from '../hooks/useDocumentTitle';
import {ReloadAllButton} from '../workspace/ReloadAllButton';

import {AssetGlobalLineageLink, AssetPageHeader} from './AssetPageHeader';
import {AssetView} from './AssetView';
import {AssetsCatalogTable} from './AssetsCatalogTable';
import {assetDetailsPathForKey} from './assetDetailsPathForKey';
import {
  AssetsCatalogRootQuery,
  AssetsCatalogRootQueryVariables,
} from './types/AssetsCatalogRootQuery';

export const AssetsCatalogRoot = () => {
  useTrackPageView();

  const params = useParams();
  const history = useHistory();
  const currentPath: string[] = (params['0'] || '')
    .split('/')
    .filter((x: string) => x)
    .map(decodeURIComponent);

  const queryResult = useQuery<AssetsCatalogRootQuery, AssetsCatalogRootQueryVariables>(
    ASSETS_CATALOG_ROOT_QUERY,
    {
      skip: currentPath.length === 0,
      variables: {assetKey: {path: currentPath}},
    },
  );

  useDocumentTitle(
    currentPath && currentPath.length
      ? `Assets: ${displayNameForAssetKey({path: currentPath})}`
      : 'Assets',
  );

  return queryResult.loading ? (
    <Page>
      <AssetPageHeader assetKey={{path: currentPath}} />
      <Box padding={64}>
        <Spinner purpose="page" />
      </Box>
    </Page>
  ) : currentPath.length === 0 ||
    queryResult.data?.assetOrError.__typename === 'AssetNotFoundError' ? (
    <Page>
      <AssetPageHeader
        assetKey={{path: currentPath}}
        right={
          <Box flex={{gap: 12, alignItems: 'center'}}>
            <AssetGlobalLineageLink />
            <ReloadAllButton label="Reload definitions" />
          </Box>
        }
      />
      <AssetsCatalogTable
        prefixPath={currentPath}
        setPrefixPath={(prefixPath) => history.push(assetDetailsPathForKey({path: prefixPath}))}
      />
    </Page>
  ) : (
    <AssetView assetKey={{path: currentPath}} />
  );
};

// Imported via React.lazy, which requires a default export.
// eslint-disable-next-line import/no-default-export
export default AssetsCatalogRoot;

const ASSETS_CATALOG_ROOT_QUERY = gql`
  query AssetsCatalogRootQuery($assetKey: AssetKeyInput!) {
    assetOrError(assetKey: $assetKey) {
      __typename
      ... on Asset {
        id
        key {
          path
        }
      }
    }
  }
`;
