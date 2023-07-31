import {Box} from '@dagster-io/ui';
import * as React from 'react';

import {AssetLink} from '../assets/AssetLink';
import {SensorMetadata} from '../graphql/types';

export const SensorMonitoredAssets: React.FC<{
  metadata: SensorMetadata | undefined;
}> = ({metadata}) => {
  if (!metadata?.assetKeys?.length) {
    return <span />;
  }
  return (
    <Box flex={{direction: 'column', gap: 2}}>
      {metadata.assetKeys.map((key) => (
        <AssetLink key={key.path.join('/')} path={key.path} icon="asset" />
      ))}
    </Box>
  );
};
