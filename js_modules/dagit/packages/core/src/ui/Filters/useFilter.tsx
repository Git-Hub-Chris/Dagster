import {BaseTag, Colors, Icon, IconName} from '@dagster-io/ui';
import React from 'react';
import styled from 'styled-components/macro';

import {TruncatedTextWithFullTextOnHover} from '../../nav/getLeftNavItemsForOption';

export type FilterListenerCallback<TState> = (value: {
  state: TState;
  previousActive: boolean;
  active: boolean;
  name: string;
}) => void;

export type FilterObject<TState> = {
  isActive: boolean;
  activeJSX: JSX.Element;
  icon: IconName;
  name: string;
  getResults: (query: string) => {label: JSX.Element; key: string; value: any}[];
  onSelect: (selectArg: {
    value: any;
    close: () => void;
    createPortal: (element: JSX.Element) => () => void;
  }) => void;
  state: TState;
  setState: (state: TState) => void;
};

export const FilterTag = ({
  iconName,
  label,
  onRemove,
}: {
  label: JSX.Element;
  iconName: IconName;
  onRemove: () => void;
}) => (
  <BaseTag
    icon={<Icon name={iconName} color={Colors.Link} />}
    rightIcon={
      <div onClick={onRemove} style={{cursor: 'pointer'}} tabIndex={0}>
        <Icon name="close" color={Colors.Link} />
      </div>
    }
    label={label}
    fillColor={Colors.Blue50}
    textColor={Colors.Link}
  />
);

const FilterTagHighlightedTextSpan = styled(TruncatedTextWithFullTextOnHover)`
  color: ${Colors.Blue500};
  font-weight: 600;
  font-size: 12px;
  max-width: 100px;
`;

export const FilterTagHighlightedText = React.forwardRef(
  (
    {
      children,
      ...rest
    }: Omit<React.ComponentProps<typeof TruncatedTextWithFullTextOnHover>, 'text'> & {
      children: string;
    },
    ref: React.ForwardedRef<HTMLDivElement>,
  ) => {
    return (
      <FilterTagHighlightedTextSpan
        text={children}
        tooltipStyle={LabelTooltipStyles}
        {...rest}
        ref={ref}
      />
    );
  },
);

const LabelTooltipStyles = JSON.stringify({
  background: Colors.Blue50,
  color: Colors.Blue500,
  border: 'none',
  borderRadius: 7,
  overflow: 'hidden',
  fontSize: 12,
  padding: '5px 10px',
  transform: 'translate(-10px,-5px)',
  fontWeight: 600,
} as React.CSSProperties);
