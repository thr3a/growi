import { Suspense, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ModalBody } from 'reactstrap';
import SimpleBar from 'simplebar-react';

import ItemsTreeContentSkeleton from '~/client/components/ItemsTree/ItemsTreeContentSkeleton';
import { SimplifiedItemsTree } from '~/features/page-tree/components';
import type { IPageForTreeItem } from '~/interfaces/page';
import { useIsGuestUser, useIsReadOnlyUser } from '~/states/context';

import {
  isSelectablePage,
  type SelectablePage,
} from '../../../../interfaces/selectable-page';
import { useSelectedPages } from '../../../services/use-selected-pages';
import {
  AiAssistantManagementModalPageMode,
  useAiAssistantManagementModalActions,
  useAiAssistantManagementModalStatus,
} from '../../../states/modal/ai-assistant-management';
import { AiAssistantManagementHeader } from './AiAssistantManagementHeader';
import { SelectablePageList } from './SelectablePageList';
import {
  SimplifiedTreeItemWithCheckbox,
  simplifiedTreeItemWithCheckboxSize,
} from './SimplifiedTreeItemWithCheckbox';

import styles from './AiAssistantManagementPageTreeSelection.module.scss';

const moduleClass =
  styles['grw-ai-assistant-management-page-tree-selection'] ?? '';

type Props = {
  baseSelectedPages: SelectablePage[];
  updateBaseSelectedPages: (pages: SelectablePage[]) => void;
};

export const AiAssistantManagementPageTreeSelection = (
  props: Props,
): JSX.Element => {
  const { baseSelectedPages, updateBaseSelectedPages } = props;

  const { t } = useTranslation();
  const isGuestUser = useIsGuestUser();
  const isReadOnlyUser = useIsReadOnlyUser();
  const aiAssistantManagementModalData = useAiAssistantManagementModalStatus();
  const { changePageMode } = useAiAssistantManagementModalActions();
  const isNewAiAssistant =
    aiAssistantManagementModalData?.aiAssistantData == null;

  // Scroll container for virtualization
  const [scrollerElem, setScrollerElem] = useState<HTMLElement | null>(null);

  const { selectedPages, selectedPagesArray, addPage, removePage } =
    useSelectedPages(baseSelectedPages);

  // Calculate initial checked items from baseSelectedPages
  // Remove the /* suffix to match with page IDs
  const initialCheckedItems = useMemo(() => {
    return baseSelectedPages
      .filter((page) => page._id != null)
      .map((page) => page._id as string);
  }, [baseSelectedPages]);

  // Handle checked items change from tree
  const handleCheckedItemsChange = useCallback(
    (checkedPages: IPageForTreeItem[]) => {
      // Get current checked page IDs (with /* suffix paths)
      const currentCheckedPaths = new Set(
        checkedPages
          .filter((page) => isSelectablePage(page) && page.path != null)
          .map((page) => `${page.path}/*`),
      );

      // Get currently selected page paths
      const currentSelectedPaths = new Set(selectedPages.keys());

      // Add newly checked pages
      checkedPages.forEach((page) => {
        if (!isSelectablePage(page) || page.path == null) {
          return;
        }
        const pagePathWithGlob = `${page.path}/*`;
        if (!currentSelectedPaths.has(pagePathWithGlob)) {
          const clonedPage = { ...page, path: pagePathWithGlob };
          addPage(clonedPage as SelectablePage);
        }
      });

      // Remove unchecked pages
      selectedPagesArray.forEach((page) => {
        if (page.path != null && !currentCheckedPaths.has(page.path)) {
          removePage(page);
        }
      });
    },
    [selectedPages, selectedPagesArray, addPage, removePage],
  );

  const nextButtonClickHandler = useCallback(() => {
    updateBaseSelectedPages(Array.from(selectedPages.values()));
    changePageMode(
      isNewAiAssistant
        ? AiAssistantManagementModalPageMode.HOME
        : AiAssistantManagementModalPageMode.PAGES,
    );
  }, [
    changePageMode,
    isNewAiAssistant,
    selectedPages,
    updateBaseSelectedPages,
  ]);

  const estimateTreeItemSize = useCallback(
    () => simplifiedTreeItemWithCheckboxSize,
    [],
  );

  return (
    <div className={moduleClass}>
      <AiAssistantManagementHeader
        backButtonColor="secondary"
        backToPageMode={
          baseSelectedPages.length === 0
            ? AiAssistantManagementModalPageMode.PAGE_SELECTION_METHOD
            : AiAssistantManagementModalPageMode.PAGES
        }
        labelTranslationKey={
          isNewAiAssistant
            ? 'modal_ai_assistant.header.add_new_assistant'
            : 'modal_ai_assistant.header.update_assistant'
        }
      />

      <ModalBody className="px-4">
        <h4 className="text-center fw-bold mb-3 mt-2">
          {t('modal_ai_assistant.search_reference_pages_by_keyword')}
        </h4>

        <div className="px-4">
          <div className="page-tree-container" ref={setScrollerElem}>
            {scrollerElem != null && (
              <Suspense fallback={<ItemsTreeContentSkeleton />}>
                <SimplifiedItemsTree
                  targetPath="/"
                  isEnableActions={!isGuestUser}
                  isReadOnlyUser={!!isReadOnlyUser}
                  CustomTreeItem={SimplifiedTreeItemWithCheckbox}
                  estimateTreeItemSize={estimateTreeItemSize}
                  scrollerElem={scrollerElem}
                  enableCheckboxes
                  initialCheckedItems={initialCheckedItems}
                  onCheckedItemsChange={handleCheckedItemsChange}
                />
              </Suspense>
            )}
          </div>
        </div>

        <h4 className="text-center fw-bold mb-3 mt-4">
          {t('modal_ai_assistant.reference_pages')}
        </h4>

        <div className="px-4">
          <SimpleBar
            className="page-list-container"
            style={{ maxHeight: '300px' }}
          >
            <SelectablePageList
              method="remove"
              methodButtonPosition="right"
              pages={selectedPagesArray}
              onClickMethodButton={removePage}
            />
          </SimpleBar>
          <span className="form-text text-muted mt-2">
            {t('modal_ai_assistant.can_add_later')}
          </span>
        </div>

        <div className="d-flex justify-content-center mt-4">
          <button
            type="button"
            className="btn btn-primary rounded next-button"
            disabled={selectedPages.size === 0}
            onClick={nextButtonClickHandler}
          >
            {t('modal_ai_assistant.next')}
          </button>
        </div>
      </ModalBody>
    </div>
  );
};
