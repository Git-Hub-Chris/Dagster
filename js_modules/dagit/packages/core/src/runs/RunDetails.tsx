import {
  Button,
  Colors,
  DialogFooter,
  Dialog,
  Group,
  Icon,
  MenuItem,
  Menu,
  MetadataTable,
  Popover,
  Tooltip,
  Subheading,
  Box,
  StyledReadOnlyCodeMirror,
} from '@dagster-io/ui';
import * as React from 'react';
import {useHistory} from 'react-router-dom';
import styled from 'styled-components/macro';

import {AppContext} from '../app/AppContext';
import {SharedToaster} from '../app/DomUtils';
import {usePermissionsDEPRECATED} from '../app/Permissions';
import {useCopyToClipboard} from '../app/browser';
import {graphql} from '../graphql';
import {RunDetailsFragmentFragment, RunFragmentFragment, RunStatus} from '../graphql/graphql';
import {TimestampDisplay} from '../schedules/TimestampDisplay';
import {AnchorButton} from '../ui/AnchorButton';
import {workspacePathFromRunDetails, workspacePipelinePath} from '../workspace/workspacePath';

import {DeletionDialog} from './DeletionDialog';
import {RunTags} from './RunTags';
import {RunsQueryRefetchContext} from './RunUtils';
import {TerminationDialog} from './TerminationDialog';
import {TimeElapsed} from './TimeElapsed';

export const timingStringForStatus = (status?: RunStatus) => {
  switch (status) {
    case RunStatus.QUEUED:
      return 'Queued';
    case RunStatus.CANCELED:
      return 'Canceled';
    case RunStatus.CANCELING:
      return 'Canceling…';
    case RunStatus.FAILURE:
      return 'Failed';
    case RunStatus.NOT_STARTED:
      return 'Waiting to start…';
    case RunStatus.STARTED:
      return 'Started…';
    case RunStatus.STARTING:
      return 'Starting…';
    case RunStatus.SUCCESS:
      return 'Succeeded';
    default:
      return 'None';
  }
};

const LoadingOrValue: React.FC<{
  loading: boolean;
  children: () => React.ReactNode;
}> = ({loading, children}) =>
  loading ? <div style={{color: Colors.Gray400}}>Loading…</div> : <div>{children()}</div>;

const TIME_FORMAT = {showSeconds: true, showTimezone: false};

export const RunDetails: React.FC<{
  loading: boolean;
  run: RunDetailsFragmentFragment | undefined;
}> = ({loading, run}) => {
  return (
    <MetadataTable
      spacing={0}
      rows={[
        {
          key: 'Started',
          value: (
            <LoadingOrValue loading={loading}>
              {() => {
                if (run?.startTime) {
                  return <TimestampDisplay timestamp={run.startTime} timeFormat={TIME_FORMAT} />;
                }
                return (
                  <div style={{color: Colors.Gray400}}>{timingStringForStatus(run?.status)}</div>
                );
              }}
            </LoadingOrValue>
          ),
        },
        {
          key: 'Ended',
          value: (
            <LoadingOrValue loading={loading}>
              {() => {
                if (run?.endTime) {
                  return <TimestampDisplay timestamp={run.endTime} timeFormat={TIME_FORMAT} />;
                }
                return (
                  <div style={{color: Colors.Gray400}}>{timingStringForStatus(run?.status)}</div>
                );
              }}
            </LoadingOrValue>
          ),
        },
        {
          key: 'Duration',
          value: (
            <LoadingOrValue loading={loading}>
              {() => {
                if (run?.startTime) {
                  return <TimeElapsed startUnix={run.startTime} endUnix={run.endTime} />;
                }
                return (
                  <div style={{color: Colors.Gray400}}>{timingStringForStatus(run?.status)}</div>
                );
              }}
            </LoadingOrValue>
          ),
        },
      ]}
    />
  );
};

type VisibleDialog = 'config' | 'delete' | 'terminate' | null;

export const RunConfigDialog: React.FC<{run: RunFragmentFragment; isJob: boolean}> = ({
  run,
  isJob,
}) => {
  const {runConfigYaml} = run;
  const [visibleDialog, setVisibleDialog] = React.useState<VisibleDialog>(null);

  const {rootServerURI} = React.useContext(AppContext);
  const {refetch} = React.useContext(RunsQueryRefetchContext);
  const {canTerminatePipelineExecution, canDeletePipelineRun} = usePermissionsDEPRECATED();

  const copy = useCopyToClipboard();
  const history = useHistory();

  const copyConfig = () => {
    copy(runConfigYaml);
    SharedToaster.show({
      intent: 'success',
      icon: 'copy_to_clipboard_done',
      message: 'Copied!',
    });
  };

  const jobPath = workspacePathFromRunDetails({
    id: run.id,
    repositoryName: run.repositoryOrigin?.repositoryName,
    repositoryLocationName: run.repositoryOrigin?.repositoryLocationName,
    pipelineName: run.pipelineName,
    isJob,
  });

  return (
    <div>
      <Group direction="row" spacing={8}>
        <AnchorButton icon={<Icon name="edit" />} to={jobPath}>
          Open in Launchpad
        </AnchorButton>
        <Button icon={<Icon name="tag" />} onClick={() => setVisibleDialog('config')}>
          View tags and config
        </Button>
        <Popover
          position="bottom-right"
          content={
            <Menu>
              <Tooltip content="Loadable in dagit-debug" position="left" targetTagName="div">
                <MenuItem
                  text="Download debug file"
                  icon={<Icon name="download_for_offline" />}
                  onClick={() => window.open(`${rootServerURI}/download_debug/${run.runId}`)}
                />
              </Tooltip>
              {canDeletePipelineRun.enabled ? (
                <MenuItem
                  icon="delete"
                  text="Delete"
                  intent="danger"
                  onClick={() => setVisibleDialog('delete')}
                />
              ) : null}
            </Menu>
          }
        >
          <Button icon={<Icon name="expand_more" />} />
        </Popover>
      </Group>
      <Dialog
        isOpen={visibleDialog === 'config'}
        onClose={() => setVisibleDialog(null)}
        style={{
          width: '90vw',
          maxWidth: '1000px',
          minWidth: '600px',
          height: '90vh',
          maxHeight: '1000px',
          minHeight: '600px',
        }}
        title="Run configuration"
      >
        <Box flex={{direction: 'column'}} style={{flex: 1, overflow: 'hidden'}}>
          <Box flex={{direction: 'column', gap: 20}} style={{flex: 1, overflow: 'hidden'}}>
            <Box flex={{direction: 'column', gap: 12}} padding={{top: 16, horizontal: 24}}>
              <Subheading>Tags</Subheading>
              <div>
                <RunTags tags={run.tags} mode={isJob ? null : run.mode} />
              </div>
            </Box>
            <Box flex={{direction: 'column'}} style={{flex: 1, overflow: 'hidden'}}>
              <Box
                border={{side: 'bottom', width: 1, color: Colors.KeylineGray}}
                padding={{left: 24, bottom: 16}}
              >
                <Subheading>Config</Subheading>
              </Box>
              <CodeMirrorContainer>
                <StyledReadOnlyCodeMirror
                  value={runConfigYaml}
                  options={{lineNumbers: true, mode: 'yaml'}}
                  theme={['config-editor']}
                />
              </CodeMirrorContainer>
            </Box>
          </Box>
          <DialogFooter topBorder>
            <Button onClick={() => copyConfig()} intent="none">
              Copy config
            </Button>
            <Button onClick={() => setVisibleDialog(null)} intent="primary">
              OK
            </Button>
          </DialogFooter>
        </Box>
      </Dialog>
      {canDeletePipelineRun.enabled ? (
        <DeletionDialog
          isOpen={visibleDialog === 'delete'}
          onClose={() => setVisibleDialog(null)}
          onComplete={() => {
            if (run.repositoryOrigin) {
              history.push(
                workspacePipelinePath({
                  repoName: run.repositoryOrigin.repositoryName,
                  repoLocation: run.repositoryOrigin.repositoryLocationName,
                  pipelineName: run.pipelineName,
                  isJob,
                  path: '/runs',
                }),
              );
            } else {
              setVisibleDialog(null);
            }
          }}
          onTerminateInstead={() => setVisibleDialog('terminate')}
          selectedRuns={{[run.id]: run.canTerminate}}
        />
      ) : null}
      {canTerminatePipelineExecution.enabled ? (
        <TerminationDialog
          isOpen={visibleDialog === 'terminate'}
          onClose={() => setVisibleDialog(null)}
          onComplete={() => {
            refetch();
          }}
          selectedRuns={{[run.id]: run.canTerminate}}
        />
      ) : null}
    </div>
  );
};

const CodeMirrorContainer = styled.div`
  flex: 1;
  overflow: hidden;

  .react-codemirror2,
  .CodeMirror {
    height: 100%;
  }
`;

export const RUN_DETAILS_FRAGMENT = graphql(`
  fragment RunDetailsFragment on Run {
    id
    startTime
    endTime
    status
  }
`);
