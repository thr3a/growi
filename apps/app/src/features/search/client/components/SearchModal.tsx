import Downshift, {
  type DownshiftState,
  type StateChangeOptions,
} from 'downshift';
import { useRouter } from 'next/router';
import { type JSX, useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, ModalBody } from 'reactstrap';

import { isIncludeAiMenthion, removeAiMenthion } from '../../utils/ai';
import type { DownshiftItem } from '../interfaces/downshift';
import { useSearchModal } from '../stores/search';

import { SearchForm } from './SearchForm';
import { SearchHelp } from './SearchHelp';
import { SearchMethodMenuItem } from './SearchMethodMenuItem';
import { SearchResultMenuItem } from './SearchResultMenuItem';

const SearchModalSubstance = (): JSX.Element => {
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isMenthionedToAi, setMenthionedToAi] = useState(false);

  const { data: searchModalData, close: closeSearchModal } = useSearchModal();
  const router = useRouter();

  const changeSearchTextHandler = useCallback((searchText: string) => {
    setSearchKeyword(searchText);
  }, []);

  const selectSearchMenuItemHandler = useCallback(
    (selectedItem: DownshiftItem) => {
      router.push(selectedItem.url);
      closeSearchModal();
    },
    [closeSearchModal, router],
  );

  const submitHandler = useCallback(() => {
    const url = new URL('_search', 'http://example.com');
    url.searchParams.set('q', searchKeyword);
    router.push(url.pathname + url.search);
    closeSearchModal();
  }, [closeSearchModal, router, searchKeyword]);

  // Memoize stateReducer to prevent recreation on every render
  const stateReducer = useCallback(
    (
      state: DownshiftState<DownshiftItem>,
      changes: StateChangeOptions<DownshiftItem>,
    ) => {
      // Do not update highlightedIndex on mouse hover
      if (changes.type === Downshift.stateChangeTypes.itemMouseEnter) {
        return {
          ...changes,
          highlightedIndex: state.highlightedIndex,
        };
      }

      return changes;
    },
    [],
  );

  useEffect(() => {
    if (!searchModalData?.isOpened) {
      return;
    }
    if (searchModalData?.searchKeyword == null) {
      setSearchKeyword('');
    } else {
      setSearchKeyword(searchModalData.searchKeyword);
    }
  }, [searchModalData?.isOpened, searchModalData?.searchKeyword]);

  useEffect(() => {
    setMenthionedToAi(isIncludeAiMenthion(searchKeyword));
  }, [searchKeyword]);

  // Memoize AI mention removal to prevent recalculation on every render
  const searchKeywordWithoutAi = useMemo(
    () => removeAiMenthion(searchKeyword),
    [searchKeyword],
  );

  // Memoize icon selection to prevent recalculation
  const searchIcon = useMemo(
    () => (isMenthionedToAi ? 'psychology' : 'search'),
    [isMenthionedToAi],
  );

  // Memoize icon class to prevent string concatenation on every render
  const iconClassName = useMemo(
    () =>
      `material-symbols-outlined fs-4 me-3 ${isMenthionedToAi ? 'text-primary' : ''}`,
    [isMenthionedToAi],
  );

  return (
    <ModalBody className="pb-2">
      <Downshift
        onSelect={selectSearchMenuItemHandler}
        stateReducer={stateReducer}
        defaultIsOpen
      >
        {({
          getRootProps,
          getInputProps,
          getItemProps,
          getMenuProps,
          highlightedIndex,
        }) => (
          <div {...getRootProps({}, { suppressRefError: true })}>
            <div className="text-muted d-flex justify-content-center align-items-center p-1">
              <span className={iconClassName}>{searchIcon}</span>
              <SearchForm
                searchKeyword={searchKeyword}
                onChange={changeSearchTextHandler}
                onSubmit={submitHandler}
                getInputProps={getInputProps}
              />
              <button
                type="button"
                className="btn border-0 d-flex justify-content-center p-0"
                onClick={closeSearchModal}
              >
                <span className="material-symbols-outlined fs-4 ms-3 py-0">
                  close
                </span>
              </button>
            </div>

            <ul {...getMenuProps()} className="list-unstyled m-0">
              <div className="border-top mt-2 mb-2" />
              <SearchMethodMenuItem
                activeIndex={highlightedIndex}
                searchKeyword={searchKeywordWithoutAi}
                getItemProps={getItemProps}
              />
              <SearchResultMenuItem
                activeIndex={highlightedIndex}
                searchKeyword={searchKeywordWithoutAi}
                getItemProps={getItemProps}
              />
              <div className="border-top mt-2 mb-2" />
            </ul>
          </div>
        )}
      </Downshift>
      <SearchHelp />
    </ModalBody>
  );
};

const SearchModal = (): JSX.Element => {
  const { data: searchModalData, close: closeSearchModal } = useSearchModal();

  // Early return for performance optimization
  if (!searchModalData?.isOpened) {
    return <></>;
  }

  return (
    <Modal
      size="lg"
      isOpen={searchModalData.isOpened}
      toggle={closeSearchModal}
      data-testid="search-modal"
    >
      <SearchModalSubstance />
    </Modal>
  );
};

export default SearchModal;
