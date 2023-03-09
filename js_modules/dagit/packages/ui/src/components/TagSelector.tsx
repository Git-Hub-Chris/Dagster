import React from 'react';
import {List} from 'react-virtualized';
import styled from 'styled-components/macro';

import {Box} from './Box';
import {Checkbox} from './Checkbox';
import {Colors} from './Colors';
import {Icon} from './Icon';
import {MenuItem, Menu} from './Menu';
import {Popover} from './Popover';
import {Tag} from './Tag';
import {TextInputStyles} from './TextInput';
import {useViewport} from './useViewport';

type TagProps = {
  remove: (ev: React.SyntheticEvent<HTMLDivElement>) => void;
};
type DropdownItemProps = {
  toggle: () => void;
  selected: boolean;
};
type DropdownProps = {
  width: string;
};
type Props = {
  placeholder?: React.ReactNode;
  allTags: string[];
  selectedTags: string[];
  setSelectedTags: (tags: string[]) => void;
  renderTag?: (tag: string, tagProps: TagProps) => React.ReactNode;
  renderTagList?: (tags: React.ReactNode[]) => React.ReactNode;
  renderDropdown?: (dropdown: React.ReactNode, dropdownProps: DropdownProps) => React.ReactNode;
  renderDropdownItem?: (tag: string, dropdownItemProps: DropdownItemProps) => React.ReactNode;
  dropdownStyles?: React.CSSProperties;
  rowWidth?: number;
  rowHeight?: number;
};

const defaultRenderTag = (tag: string, tagProps: TagProps) => {
  return (
    <Tag key={tag}>
      <Box flex={{direction: 'row', gap: 4, justifyContent: 'space-between', alignItems: 'center'}}>
        <span>{tag}</span>
        <Box style={{cursor: 'pointer'}} onClick={tagProps.remove}>
          <Icon name="close" />
        </Box>
      </Box>
    </Tag>
  );
};

const defaultRenderDropdownItem = (tag: string, dropdownItemProps: DropdownItemProps) => {
  return (
    <label>
      <MenuItem
        text={
          <Box flex={{alignItems: 'center', gap: 8}}>
            <Checkbox checked={dropdownItemProps.selected} onChange={dropdownItemProps.toggle} />
            <span>{tag}</span>
          </Box>
        }
        tagName="div"
      />
    </label>
  );
};

const MENU_ITEM_HEIGHT = 32;

export const TagSelector = ({
  allTags,
  placeholder,
  selectedTags,
  setSelectedTags,
  renderTag,
  renderDropdownItem,
  renderDropdown,
  dropdownStyles,
  renderTagList,
  rowHeight = MENU_ITEM_HEIGHT,
}: Props) => {
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
  const {viewport, containerProps} = useViewport();
  const dropdown = React.useMemo(() => {
    const dropdownContent = (
      <Box
        style={{
          maxHeight: '500px',
          overflowY: 'auto',
          ...dropdownStyles,
        }}
      >
        <List
          style={{outline: 'none', marginRight: -5, paddingRight: 5}}
          rowCount={allTags.length}
          rowHeight={rowHeight}
          rowRenderer={(a) => {
            const tag = allTags[a.index]!;
            const selected = selectedTags.includes(tag);
            const toggle = () => {
              setSelectedTags(
                selected ? selectedTags.filter((t) => t !== tag) : [...selectedTags, tag],
              );
            };
            if (renderDropdownItem) {
              return <div key={tag}>{renderDropdownItem(tag, {toggle, selected})}</div>;
            }
            return defaultRenderDropdownItem(tag, {toggle, selected});
          }}
          width={viewport.width}
          height={Math.min(allTags.length * rowHeight, rowHeight * 7.5)}
        />
      </Box>
    );
    if (renderDropdown) {
      return renderDropdown(dropdownContent, {width: viewport.width + 'px'});
    }
    return <Menu style={{width: viewport.width + 'px'}}>{dropdownContent}</Menu>;
  }, [
    allTags,
    dropdownStyles,
    renderDropdown,
    renderDropdownItem,
    rowHeight,
    selectedTags,
    setSelectedTags,
    viewport.width,
  ]);

  const dropdownContainer = React.useRef<HTMLDivElement>(null);

  const tagsContent = React.useMemo(() => {
    if (selectedTags.length === 0) {
      return <Placeholder>{placeholder || 'Select tags'}</Placeholder>;
    }
    const tags = selectedTags.map((tag) =>
      (renderTag || defaultRenderTag)(tag, {
        remove: (ev) => {
          setSelectedTags(selectedTags.filter((t) => t !== tag));
          ev.stopPropagation();
        },
      }),
    );
    if (renderTagList) {
      return renderTagList(tags);
    }
    return tags;
  }, [selectedTags, renderTagList, placeholder, renderTag, setSelectedTags]);

  return (
    <Popover
      placement="bottom-start"
      isOpen={isDropdownOpen}
      onInteraction={(nextOpenState, e) => {
        const target = e?.target;
        if (isDropdownOpen && target instanceof HTMLElement) {
          const isClickInside = dropdownContainer.current?.contains(target);
          if (!isClickInside) {
            setIsDropdownOpen(nextOpenState);
          }
        }
      }}
      content={<div ref={dropdownContainer}>{dropdown}</div>}
      targetTagName="div"
    >
      <Container
        onClick={() => {
          setIsDropdownOpen((isOpen) => !isOpen);
        }}
        {...containerProps}
      >
        <TagsContainer flex={{grow: 1, gap: 6}}>{tagsContent}</TagsContainer>
        <div style={{cursor: 'pointer'}}>
          <Icon name={isDropdownOpen ? 'expand_less' : 'expand_more'} />
        </div>
      </Container>
    </Popover>
  );
};

const Container = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;

  ${TextInputStyles}
`;

const Placeholder = styled.div`
  color: ${Colors.Gray400};
`;

const TagsContainer = styled(Box)`
  overflow-x: auto;

  &::-webkit-scrollbar {
    display: none;
  }
  scrollbar-width: none;
  -ms-overflow-style: none;
`;
