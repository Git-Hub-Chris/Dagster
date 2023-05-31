import {MockedProvider} from '@apollo/client/testing';
import {render, screen} from '@testing-library/react';
import React from 'react';
import {MemoryRouter} from 'react-router';

import {AssetsCatalogTable} from '../AssetsCatalogTable';
import {
  AssetCatalogGroupTableMock,
  AssetCatalogTableMock,
  SingleAssetQueryLastRunFailed,
  SingleAssetQueryMaterializedStaleAndLate,
  SingleAssetQueryMaterializedWithLatestRun,
  SingleAssetQueryTrafficDashboard,
} from '../__fixtures__/AssetTables.fixtures';

const MOCKS = [
  AssetCatalogTableMock,
  AssetCatalogGroupTableMock,
  SingleAssetQueryTrafficDashboard,
  SingleAssetQueryMaterializedWithLatestRun,
  SingleAssetQueryMaterializedStaleAndLate,
  SingleAssetQueryLastRunFailed,
];

// This file must be mocked because Jest can't handle `import.meta.url`.
jest.mock('../../graph/asyncGraphLayout', () => ({}));

describe('AssetTable', () => {
  describe('Materialize button', () => {
    it('is enabled when rows are selected', async () => {
      const Test = () => {
        return (
          <MemoryRouter>
            <MockedProvider mocks={MOCKS}>
              <AssetsCatalogTable prefixPath={['dashboards']} setPrefixPath={() => {}} />
            </MockedProvider>
          </MemoryRouter>
        );
      };
      render(<Test />);

      expect(await screen.findByTestId('materialize-button')).toBeDisabled();
      expect(await screen.findByTestId('materialize-button')).toHaveTextContent(
        'Materialize selected',
      );

      const row1 = await screen.findByTestId(`row-dashboards/cost_dashboard`);
      const checkbox1 = row1.querySelector('input[type=checkbox]') as HTMLInputElement;
      await checkbox1.click();

      expect(await screen.findByTestId('materialize-button')).toHaveTextContent('Materialize');

      const row2 = await screen.findByTestId(`row-dashboards/traffic_dashboard`);
      const checkbox2 = row2.querySelector('input[type=checkbox]') as HTMLInputElement;
      await checkbox2.click();

      expect(await screen.findByTestId('materialize-button')).toHaveTextContent('Materialize (2)');
    });
  });
});
