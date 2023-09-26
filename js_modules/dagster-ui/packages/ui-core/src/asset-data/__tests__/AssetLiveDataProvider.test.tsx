jest.useFakeTimers();

import {MockedProvider, MockedResponse} from '@apollo/client/testing';
import {render, act, waitFor} from '@testing-library/react';
import React from 'react';

import {
  AssetGraphLiveQuery,
  AssetGraphLiveQueryVariables,
} from '../../asset-graph/types/useLiveDataForAssetKeys.types';
import {ASSETS_GRAPH_LIVE_QUERY} from '../../asset-graph/useLiveDataForAssetKeys';
import {
  AssetKey,
  AssetKeyInput,
  buildAssetKey,
  buildAssetLatestInfo,
  buildAssetNode,
} from '../../graphql/types';
import {buildQueryMock, getMockResultFn} from '../../testing/mocking';
import {
  AssetLiveDataProvider,
  SUBSCRIPTION_IDLE_POLL_RATE,
  _testOnly_resetLastFetchedOrRequested,
  useAssetsLiveData,
} from '../AssetLiveDataProvider';

Object.defineProperty(document, 'visibilityState', {value: 'visible', writable: true});
Object.defineProperty(document, 'hidden', {value: false, writable: true});

function buildMockedQuery(assetKeys: AssetKeyInput[]) {
  return buildQueryMock<AssetGraphLiveQuery, AssetGraphLiveQueryVariables>({
    query: ASSETS_GRAPH_LIVE_QUERY,
    variables: {
      // strip __typename
      assetKeys: assetKeys.map((assetKey) => ({path: assetKey.path})),
    },
    data: {
      assetNodes: assetKeys.map((assetKey) =>
        buildAssetNode({assetKey: buildAssetKey(assetKey), id: JSON.stringify(assetKey)}),
      ),
      assetsLatestInfo: assetKeys.map((assetKey) =>
        buildAssetLatestInfo({assetKey: buildAssetKey(assetKey), id: JSON.stringify(assetKey)}),
      ),
    },
  });
}

afterEach(() => {
  _testOnly_resetLastFetchedOrRequested();
});

function Test({
  mocks,
  hooks,
}: {
  mocks: MockedResponse[];
  hooks: {
    keys: AssetKeyInput[];
    hookResult: (data: ReturnType<typeof useAssetsLiveData>) => void;
  }[];
}) {
  function Hook({
    keys,
    hookResult,
  }: {
    keys: AssetKeyInput[];
    hookResult: (data: ReturnType<typeof useAssetsLiveData>) => void;
  }) {
    hookResult(useAssetsLiveData(keys));
    return <div />;
  }
  return (
    <MockedProvider mocks={mocks}>
      <AssetLiveDataProvider>
        {hooks.map(({keys, hookResult}, idx) => (
          <Hook key={idx} keys={keys} hookResult={hookResult} />
        ))}
      </AssetLiveDataProvider>
    </MockedProvider>
  );
}

describe('AssetLiveDataProvider', () => {
  it('provides asset data and uses cache if recently fetched', async () => {
    const assetKeys = [buildAssetKey({path: ['key1']})];
    const mockedQuery = buildMockedQuery(assetKeys);
    const mockedQuery2 = buildMockedQuery(assetKeys);

    const resultFn = getMockResultFn(mockedQuery);
    const resultFn2 = getMockResultFn(mockedQuery2);

    const hookResult = jest.fn();
    const hookResult2 = jest.fn();

    const {rerender} = render(
      <Test mocks={[mockedQuery, mockedQuery2]} hooks={[{keys: assetKeys, hookResult}]} />,
    );

    // Initially an empty object
    expect(resultFn).toHaveBeenCalledTimes(0);
    expect(hookResult.mock.results[0]!.value).toEqual(undefined);

    act(() => {
      jest.runOnlyPendingTimers();
    });

    expect(resultFn).toHaveBeenCalled();
    expect(resultFn2).not.toHaveBeenCalled();

    // Re-render with the same asset keys and expect the cache to be used this time.

    rerender(
      <Test
        mocks={[mockedQuery, mockedQuery2]}
        hooks={[{keys: assetKeys, hookResult: hookResult2}]}
      />,
    );

    // Initially an empty object
    expect(resultFn2).not.toHaveBeenCalled();
    expect(hookResult2.mock.results[0]!.value).toEqual(undefined);
    act(() => {
      jest.runOnlyPendingTimers();
    });

    // Not called because we use the cache instead
    expect(resultFn2).not.toHaveBeenCalled();
    expect(hookResult2.mock.results[1]).toEqual(hookResult.mock.results[1]);

    await act(async () => {
      await Promise.resolve();
    });

    // We make a request this time so resultFn2 is called
    act(() => {
      jest.advanceTimersByTime(SUBSCRIPTION_IDLE_POLL_RATE + 1);
    });
    expect(resultFn2).toHaveBeenCalled();
    expect(hookResult2.mock.results[2]).toEqual(hookResult.mock.results[1]);
  });

  it('obeys document visibility', async () => {
    const assetKeys = [buildAssetKey({path: ['key1']})];
    const mockedQuery = buildMockedQuery(assetKeys);
    const mockedQuery2 = buildMockedQuery(assetKeys);

    const resultFn = getMockResultFn(mockedQuery);
    const resultFn2 = getMockResultFn(mockedQuery2);

    const hookResult = jest.fn();
    const hookResult2 = jest.fn();

    const {rerender} = render(
      <Test mocks={[mockedQuery, mockedQuery2]} hooks={[{keys: assetKeys, hookResult}]} />,
    );

    // Initially an empty object
    expect(resultFn).toHaveBeenCalledTimes(0);
    expect(hookResult.mock.results[0]!.value).toEqual(undefined);

    act(() => {
      jest.runOnlyPendingTimers();
    });

    expect(resultFn).toHaveBeenCalled();
    expect(resultFn2).not.toHaveBeenCalled();

    // Re-render with the same asset keys and expect the cache to be used this time.

    rerender(
      <Test
        mocks={[mockedQuery, mockedQuery2]}
        hooks={[{keys: assetKeys, hookResult: hookResult2}]}
      />,
    );

    // Initially an empty object
    expect(resultFn2).not.toHaveBeenCalled();
    expect(hookResult2.mock.results[0]!.value).toEqual(undefined);
    act(() => {
      jest.runOnlyPendingTimers();
    });

    // Not called because we use the cache instead
    expect(resultFn2).not.toHaveBeenCalled();
    expect(hookResult2.mock.results[1]).toEqual(hookResult.mock.results[1]);

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      (document as any).visibilityState = 'hidden';
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // Document isn't visible so we don't make a request
    act(() => {
      jest.advanceTimersByTime(SUBSCRIPTION_IDLE_POLL_RATE + 1);
    });
    expect(resultFn2).not.toHaveBeenCalled();

    act(() => {
      (document as any).visibilityState = 'visible';
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // Document is now visible so we make the request
    await waitFor(() => {
      expect(resultFn2).toHaveBeenCalled();
    });
  });

  it('chunks asset requests', async () => {
    const assetKeys = [];
    for (let i = 0; i < 100; i++) {
      assetKeys.push(buildAssetKey({path: [`key${i}`]}));
    }
    const chunk1 = assetKeys.slice(0, 50);
    const chunk2 = assetKeys.slice(50, 100);

    const mockedQuery = buildMockedQuery(chunk1);
    const mockedQuery2 = buildMockedQuery(chunk2);

    const resultFn = getMockResultFn(mockedQuery);
    const resultFn2 = getMockResultFn(mockedQuery2);

    const hookResult = jest.fn();

    render(<Test mocks={[mockedQuery, mockedQuery2]} hooks={[{keys: assetKeys, hookResult}]} />);

    // Initially an empty object
    expect(resultFn).not.toHaveBeenCalled();
    expect(hookResult.mock.results[0]!.value).toEqual(undefined);

    act(() => {
      jest.runOnlyPendingTimers();
    });

    // Only the first batch is sent (No stacking).
    expect(resultFn).toHaveBeenCalled();
    expect(resultFn2).not.toHaveBeenCalled();

    act(() => {
      jest.runOnlyPendingTimers();
    });

    // Second chunk is fetched
    await waitFor(() => {
      expect(resultFn2).toHaveBeenCalled();
    });
  });

  it('batches asset requests from separate hooks', async () => {
    const hookResult = jest.fn();

    const assetKeys = [];
    for (let i = 0; i < 100; i++) {
      assetKeys.push(buildAssetKey({path: [`key${i}`]}));
    }
    const chunk1 = assetKeys.slice(0, 50);
    const chunk2 = assetKeys.slice(50, 100);

    const hook1Keys = assetKeys.slice(0, 33);
    const hook2Keys = assetKeys.slice(33, 66);
    const hook3Keys = assetKeys.slice(66, 100);

    const mockedQuery = buildMockedQuery(chunk1);
    const mockedQuery2 = buildMockedQuery(chunk2);

    const resultFn = getMockResultFn(mockedQuery);
    const resultFn2 = getMockResultFn(mockedQuery2);

    render(
      <Test
        mocks={[mockedQuery, mockedQuery2]}
        hooks={[
          {keys: hook1Keys, hookResult},
          {keys: hook2Keys, hookResult},
          {keys: hook3Keys, hookResult},
        ]}
      />,
    );
    act(() => {
      jest.runOnlyPendingTimers();
    });

    // Only the first batch is sent (No stacking).
    expect(resultFn).toHaveBeenCalled();
    expect(resultFn2).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(resultFn2).toHaveBeenCalled();
    });
  });

  it('prioritizes assets which were never fetched over previously fetched assets', async () => {
    const hookResult = jest.fn();
    const assetKeys = [];
    for (let i = 0; i < 60; i++) {
      assetKeys.push(buildAssetKey({path: [`key${i}`]}));
    }

    // First we fetch these specific keys
    const fetch1Keys = [
      assetKeys[0],
      assetKeys[2],
      assetKeys[4],
      assetKeys[6],
      assetKeys[8],
    ] as AssetKey[];

    // Next we fetch all of the keys after waiting SUBSCRIPTION_IDLE_POLL_RATE
    // which would have made the previously fetched keys elgible for fetching again
    const firstPrioritizedFetchKeys = assetKeys
      .filter((key) => fetch1Keys.indexOf(key) === -1)
      .slice(0, 50);

    // Next we fetch all of the keys not fetched in the previous batch with the originally fetched keys
    // at the end of the batch since they were previously fetched already
    const secondPrioritizedFetchKeys = assetKeys.filter(
      (key) => firstPrioritizedFetchKeys.indexOf(key) === -1 && fetch1Keys.indexOf(key) === -1,
    );

    secondPrioritizedFetchKeys.push(...fetch1Keys);

    const mockedQuery = buildMockedQuery(fetch1Keys);
    const mockedQuery2 = buildMockedQuery(firstPrioritizedFetchKeys);
    const mockedQuery3 = buildMockedQuery(secondPrioritizedFetchKeys);

    const resultFn = getMockResultFn(mockedQuery);
    const resultFn2 = getMockResultFn(mockedQuery2);
    const resultFn3 = getMockResultFn(mockedQuery3);

    // First we fetch the keys from fetch1
    const {rerender} = render(
      <Test
        mocks={[mockedQuery, mockedQuery2, mockedQuery3]}
        hooks={[{keys: fetch1Keys, hookResult}]}
      />,
    );

    await waitFor(() => {
      expect(resultFn).toHaveBeenCalled();
    });
    expect(resultFn2).not.toHaveBeenCalled();
    expect(resultFn3).not.toHaveBeenCalled();

    // Now we request all of the asset keys and see that the first batch excludes the keys from fetch1 since they
    // were previously fetched.
    rerender(
      <Test
        mocks={[mockedQuery, mockedQuery2, mockedQuery3]}
        hooks={[{keys: assetKeys, hookResult}]}
      />,
    );

    // Advance timers so that the previously fetched keys are eligible for fetching but make sure they're still not prioritized
    jest.advanceTimersByTime(2 * SUBSCRIPTION_IDLE_POLL_RATE);

    await waitFor(() => {
      expect(resultFn2).toHaveBeenCalled();
      expect(resultFn3).not.toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(resultFn3).toHaveBeenCalled();
    });
  });
});
