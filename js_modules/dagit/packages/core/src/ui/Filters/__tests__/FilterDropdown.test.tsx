import {render, fireEvent, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import '@testing-library/jest-dom/extend-expect';
import {FilterDropdown, FilterDropdownButton} from '../FilterDropdown';
import {FilterObject} from '../useFilter';

let mockFilters: FilterObject<any>[];
beforeEach(() => {
  mockFilters = [
    {
      name: 'Type',
      icon: 'asset',
      onSelect: jest.fn(),
      getResults: jest.fn((key) =>
        key === 'nonexistent'
          ? []
          : [
              {label: 'Type 1', key: 'type1', value: 1},
              {label: 'Type 2', key: 'type2', value: 2},
            ],
      ),
    },
    {
      name: 'Status',
      icon: 'asset',
      onSelect: jest.fn(),
      getResults: jest.fn((key) =>
        key === 'nonexistent'
          ? []
          : [
              {label: <>Active</>, key: 'active', value: 'active'},
              {label: <>Inactive</>, key: 'inactive', value: 'inactive'},
            ],
      ),
    },
  ] as any;
});

describe('FilterDropdown', () => {
  test('displays filter categories initially', () => {
    render(
      <FilterDropdown
        filters={mockFilters}
        setIsOpen={jest.fn()}
        setPortaledElements={jest.fn()}
      />,
    );
    expect(screen.getByText(/Type/g)).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  test('searches and displays matching filters', async () => {
    render(
      <FilterDropdown
        filters={mockFilters}
        setIsOpen={jest.fn()}
        setPortaledElements={jest.fn()}
      />,
    );
    const searchInput = screen.getByPlaceholderText('Search filters...');
    fireEvent.change(searchInput, {target: {value: 'type'}});
    await waitFor(() => expect(screen.getByText('Type 1')).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText('Type 2')).toBeInTheDocument());
    await waitFor(() => expect(mockFilters[0].getResults).toHaveBeenCalledWith('type'));
    await waitFor(() => expect(mockFilters[1].getResults).toHaveBeenCalledWith('type'));
  });

  test('displays no results when no filters match', async () => {
    render(
      <FilterDropdown
        filters={mockFilters}
        setIsOpen={jest.fn()}
        setPortaledElements={jest.fn()}
      />,
    );
    const searchInput = screen.getByPlaceholderText('Search filters...');
    fireEvent.change(searchInput, {target: {value: 'nonexistent'}});
    await waitFor(() => expect(screen.getByText('No results')).toBeInTheDocument());
  });
});

describe('FilterDropdownButton', () => {
  test('opens and closes the dropdown on click', async () => {
    render(<FilterDropdownButton filters={mockFilters} />);
    const button = screen.getByRole('button');
    userEvent.click(button);
    await waitFor(() => {
      expect(screen.getByText(/Type/g)).toBeInTheDocument();
    });
    userEvent.click(button);
    await waitFor(() => {
      expect(screen.queryByText(/Type/g)).not.toBeInTheDocument();
    });
  });

  test('closes the dropdown when clicking outside', async () => {
    render(<FilterDropdownButton filters={mockFilters} />);
    const button = screen.getByRole('button');
    userEvent.click(button);
    await waitFor(() => {
      expect(screen.getByText(/Type/g)).toBeInTheDocument();
    });
    userEvent.click(document.body);
    await waitFor(() => {
      expect(screen.queryByText(/Type/g)).not.toBeInTheDocument();
    });
  });
});
