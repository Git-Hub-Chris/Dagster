import {QueryResult} from '@apollo/client';
import {Box, Tabs} from '@dagster-io/ui';
import * as React from 'react';

import {QueryRefreshCountdown, QueryRefreshState} from '../app/QueryRefresh';
import {InstanceWarningIcon} from '../nav/InstanceWarningIcon';
import {WorkspaceStatus} from '../nav/WorkspaceStatus';
import {TabLink} from '../ui/TabLink';

import {InstancePageContext} from './InstancePageContext';
import {useCanSeeConfig} from './useCanSeeConfig';

interface Props<TData> {
  refreshState?: QueryRefreshState;
  queryData?: QueryResult<TData, any>;
  tab: string;
}

export const InstanceTabs = <TData extends Record<string, any>>(props: Props<TData>) => {
  const {refreshState, tab} = props;

  const {healthTitle} = React.useContext(InstancePageContext);
  const canSeeConfig = useCanSeeConfig();

  return (
    <Box flex={{direction: 'row', justifyContent: 'space-between', alignItems: 'flex-end'}}>
      <Tabs selectedTabId={tab}>
        <TabLink
          id="code-locations"
          title="Code locations"
          to="/code-locations"
          icon={<WorkspaceStatus placeholder={false} />}
        />
        <TabLink id="definitions" title="Definitions" to="/definitions" />
        <TabLink id="health" title={healthTitle} to="/health" icon={<InstanceWarningIcon />} />
        {canSeeConfig ? <TabLink id="config" title="Configuration" to="/config" /> : null}
      </Tabs>
      {refreshState ? (
        <Box padding={{bottom: 8}}>
          <QueryRefreshCountdown refreshState={refreshState} />
        </Box>
      ) : null}
    </Box>
  );
};
