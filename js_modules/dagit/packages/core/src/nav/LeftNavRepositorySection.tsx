import {Body, Box, Colors} from '@dagster-io/ui';
import * as React from 'react';
import styled from 'styled-components/macro';

import {SectionedLeftNav} from '../ui/SectionedLeftNav';
import {DagsterRepoOption, WorkspaceContext} from '../workspace/WorkspaceContext';
import {RepoAddress} from '../workspace/types';

import {RepoNavItem} from './RepoNavItem';
import {RepositoryLocationStateObserver} from './RepositoryLocationStateObserver';

const LoadedRepositorySection: React.FC<{
  allRepos: DagsterRepoOption[];
  visibleRepos: DagsterRepoOption[];
  toggleVisible: (repoAddresses: RepoAddress[]) => void;
}> = ({allRepos, visibleRepos, toggleVisible}) => {
  const listContent = () => {
    if (visibleRepos.length) {
      return <SectionedLeftNav />;
    }

    if (allRepos.length > 0) {
      return (
        <EmptyState>
          <Box flex={{direction: 'column', gap: 8}} padding={{top: 12}}>
            <span style={{fontSize: '16px', fontWeight: 500}}>No definitions</span>
            <Body>Select a code location to see a list of jobs</Body>
          </Box>
        </EmptyState>
      );
    }

    return (
      <EmptyState>
        <Box flex={{direction: 'column', gap: 8}} padding={{top: 12}}>
          <span style={{fontSize: '16px', fontWeight: 500}}>No definitions</span>
          <Body>When you add a code location, your definitions will appear here</Body>
        </Box>
      </EmptyState>
    );
  };

  return (
    <Container>
      <ListContainer>{listContent()}</ListContainer>
      <RepositoryLocationStateObserver />
      <RepoNavItem allRepos={allRepos} selected={visibleRepos} onToggle={toggleVisible} />
    </Container>
  );
};

const Container = styled.div`
  background: ${Colors.Gray100};
  display: flex;
  flex: 1;
  overflow: none;
  flex-direction: column;
  min-height: 0;
`;

const ListContainer = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
`;

const EmptyState = styled.div`
  color: ${Colors.Gray400};
  line-height: 20px;
  padding: 6px 24px 0;
`;

export const LeftNavRepositorySection = React.memo(() => {
  const {allRepos, loading, visibleRepos, toggleVisible} = React.useContext(WorkspaceContext);

  if (loading) {
    return <div style={{flex: 1}} />;
  }

  return (
    <LoadedRepositorySection
      allRepos={allRepos}
      visibleRepos={visibleRepos}
      toggleVisible={toggleVisible}
    />
  );
});
