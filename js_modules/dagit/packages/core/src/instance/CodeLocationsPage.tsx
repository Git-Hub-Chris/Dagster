import {Box, Heading, PageHeader, Subheading} from '@dagster-io/ui-components';
import * as React from 'react';

import {useTrackPageView} from '../app/analytics';
import {useDocumentTitle} from '../hooks/useDocumentTitle';
import {ReloadAllButton} from '../workspace/ReloadAllButton';
import {RepositoryLocationsList} from '../workspace/RepositoryLocationsList';
import {WorkspaceContext} from '../workspace/WorkspaceContext';

import {InstancePageContext} from './InstancePageContext';
import {InstanceTabs} from './InstanceTabs';

export const CodeLocationsPage = () => {
  useTrackPageView();
  useDocumentTitle('Code locations');

  const {pageTitle} = React.useContext(InstancePageContext);
  const {locationEntries, loading} = React.useContext(WorkspaceContext);

  // Consider each loaded repository to be a "code location".
  const entryCount = React.useMemo(() => {
    let count = 0;
    locationEntries.forEach((entry) => {
      if (!entry.locationOrLoadError || entry.locationOrLoadError?.__typename === 'PythonError') {
        count += 1;
      } else {
        count += entry.locationOrLoadError.repositories.length;
      }
    });
    return count;
  }, [locationEntries]);

  const subheadingText = () => {
    if (loading || !entryCount) {
      return 'Code locations';
    }
    return entryCount === 1 ? '1 code location' : `${entryCount} code locations`;
  };

  return (
    <>
      <PageHeader title={<Heading>{pageTitle}</Heading>} tabs={<InstanceTabs tab="locations" />} />
      <Box
        padding={{vertical: 16, horizontal: 24}}
        flex={{direction: 'row', justifyContent: 'space-between', alignItems: 'center'}}
        style={{height: '64px'}}
      >
        <Subheading id="repository-locations">{subheadingText()}</Subheading>
        <ReloadAllButton />
      </Box>
      <RepositoryLocationsList />
    </>
  );
};

// Imported via React.lazy, which requires a default export.
// eslint-disable-next-line import/no-default-export
export default CodeLocationsPage;
