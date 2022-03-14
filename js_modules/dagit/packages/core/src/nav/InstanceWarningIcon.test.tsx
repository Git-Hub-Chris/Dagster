import {waitFor} from '@testing-library/dom';
import {render, screen} from '@testing-library/react';
import * as React from 'react';

import {TestProvider} from '../testing/TestProvider';

import {InstanceWarningIcon} from './InstanceWarningIcon';

describe('InstanceWarningIcon', () => {
  const defaultMocks = {
    DaemonHealth: () => ({
      allDaemonStatuses: () => [...new Array(3)],
    }),
  };

  const Test: React.FC<{mocks: any}> = ({mocks}) => {
    return (
      <TestProvider apolloProps={{mocks}}>
        <InstanceWarningIcon />
      </TestProvider>
    );
  };

  it('displays if daemon errors', async () => {
    const mocks = {
      DaemonStatus: () => ({
        healthy: () => false,
        required: () => true,
      }),
    };

    render(<Test mocks={[defaultMocks, mocks]} />);
    await waitFor(() => {
      expect(screen.queryByLabelText('warning')).toBeVisible();
    });
  });

  it('does not display if no errors', async () => {
    const mocks = {
      DaemonStatus: () => ({
        healthy: () => true,
      }),
    };

    render(<Test mocks={[defaultMocks, mocks]} />);
    await waitFor(() => {
      expect(screen.queryByLabelText('warning')).toBeNull();
    });
  });

  describe('Schedule/sensor errors', () => {
    describe('Schedule error', () => {
      const scheduleErrorMocks = {
        DaemonHealth: () => ({
          allDaemonStatuses: () => [
            {daemonType: 'SCHEDULER', healthy: false, required: true},
            {daemonType: 'SENSOR', healthy: true, required: true},
            {daemonType: 'OTHER', healthy: true, required: true},
          ],
        }),
      };

      it('does not display if there are no schedules, and only a scheduler error', async () => {
        const pipelineMocks = {
          Pipeline: () => ({
            sensors: () => [],
            schedules: () => [],
          }),
        };

        render(<Test mocks={[defaultMocks, scheduleErrorMocks, pipelineMocks]} />);
        await waitFor(() => {
          expect(screen.queryByLabelText('warning')).toBeNull();
        });
      });

      it('does not display if schedules are not enabled, and only a scheduler error', async () => {
        const pipelineMocks = {
          Pipeline: () => ({
            sensors: () => [],
            schedules: () => [{scheduleState: {status: 'STOPPED'}}],
          }),
        };

        render(<Test mocks={[defaultMocks, scheduleErrorMocks, pipelineMocks]} />);
        await waitFor(() => {
          expect(screen.queryByLabelText('warning')).toBeNull();
        });
      });

      it('displays if there are running schedules, and only a scheduler error', async () => {
        const pipelineMocks = {
          Pipeline: () => ({
            sensors: () => [],
            schedules: () => [{scheduleState: {status: 'RUNNING'}}],
          }),
        };

        render(<Test mocks={[defaultMocks, scheduleErrorMocks, pipelineMocks]} />);
        await waitFor(() => {
          expect(screen.queryByLabelText('warning')).toBeVisible();
        });
      });
    });

    describe('Sensor error', () => {
      const sensorErrorMocks = {
        DaemonHealth: () => ({
          allDaemonStatuses: () => [
            {daemonType: 'SCHEDULER', healthy: true, required: true},
            {daemonType: 'SENSOR', healthy: false, required: true},
            {daemonType: 'OTHER', healthy: true, required: true},
          ],
        }),
      };

      it('does not display if there are no sensors, and only a sensor error', async () => {
        const pipelineMocks = {
          Pipeline: () => ({
            sensors: () => [],
            schedules: () => [],
          }),
        };

        render(<Test mocks={[defaultMocks, sensorErrorMocks, pipelineMocks]} />);
        await waitFor(() => {
          expect(screen.queryByLabelText('warning')).toBeNull();
        });
      });

      it('displays if there are sensors, and only a sensor error', async () => {
        const pipelineMocks = {
          Pipeline: () => ({
            sensors: () => [{sensorState: {status: 'RUNNING'}}],
            schedules: () => [],
          }),
        };

        render(<Test mocks={[defaultMocks, sensorErrorMocks, pipelineMocks]} />);
        await waitFor(() => {
          expect(screen.queryByLabelText('warning')).toBeVisible();
        });
      });
    });

    describe('Schedule and Sensor error', () => {
      const errorMocks = {
        DaemonHealth: () => ({
          allDaemonStatuses: () => [
            {daemonType: 'SCHEDULER', healthy: false, required: true},
            {daemonType: 'SENSOR', healthy: false, required: true},
            {daemonType: 'OTHER', healthy: true, required: true},
          ],
        }),
      };

      it('does not display if there are no sensors/schedules, and only (both) sensor/schedule errors', async () => {
        const pipelineMocks = {
          Pipeline: () => ({
            sensors: () => [],
            schedules: () => [],
          }),
        };

        render(<Test mocks={[defaultMocks, errorMocks, pipelineMocks]} />);
        await waitFor(() => {
          expect(screen.queryByLabelText('warning')).toBeNull();
        });
      });

      it('displays if there are sensors, and only (both) sensor/schedule errors', async () => {
        const pipelineMocks = {
          Pipeline: () => ({
            sensors: () => [{sensorState: {status: 'RUNNING'}}],
            schedules: () => [],
          }),
        };

        render(<Test mocks={[defaultMocks, errorMocks, pipelineMocks]} />);
        await waitFor(() => {
          expect(screen.queryByLabelText('warning')).toBeVisible();
        });
      });

      it('displays if there are schedules, and only (both) sensor/schedule errors', async () => {
        const pipelineMocks = {
          Pipeline: () => ({
            sensors: () => [],
            schedules: () => [{scheduleState: {status: 'RUNNING'}}],
          }),
        };

        render(<Test mocks={[defaultMocks, errorMocks, pipelineMocks]} />);
        await waitFor(() => {
          expect(screen.queryByLabelText('warning')).toBeVisible();
        });
      });

      it('displays if there are schedules and sensors, and only (both) sensor/schedule errors', async () => {
        const pipelineMocks = {
          Pipeline: () => ({
            sensors: () => [{sensorState: {status: 'RUNNING'}}],
            schedules: () => [{scheduleState: {status: 'RUNNING'}}],
          }),
        };

        render(<Test mocks={[defaultMocks, errorMocks, pipelineMocks]} />);
        await waitFor(() => {
          expect(screen.queryByLabelText('warning')).toBeVisible();
        });
      });
    });

    describe('Other error', () => {
      const otherErrorMocks = {
        DaemonHealth: () => ({
          allDaemonStatuses: () => [
            {daemonType: 'SCHEDULER', healthy: true, required: true},
            {daemonType: 'SENSOR', healthy: true, required: true},
            {daemonType: 'OTHER', healthy: false, required: true},
          ],
        }),
      };

      it('displays even if there are no sensors or schedules', async () => {
        const pipelineMocks = {
          Pipeline: () => ({
            sensors: () => [],
            schedules: () => [],
          }),
        };

        render(<Test mocks={[defaultMocks, otherErrorMocks, pipelineMocks]} />);
        await waitFor(() => {
          expect(screen.queryByLabelText('warning')).toBeNull();
        });
      });
    });
  });
});
