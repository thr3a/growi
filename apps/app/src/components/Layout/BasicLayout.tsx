import type { JSX, ReactNode } from 'react';
import dynamic from 'next/dynamic';

import { GrantedGroupsInheritanceSelectModalLazyLoaded } from '~/client/components/GrantedGroupsInheritanceSelectModal';
import { PageAccessoriesModalLazyLoaded } from '~/client/components/PageAccessoriesModal';
import { PageDeleteModalLazyLoaded } from '~/client/components/PageDeleteModal';
import { PageDuplicateModalLazyLoaded } from '~/client/components/PageDuplicateModal';
import { PagePresentationModalLazyLoaded } from '~/client/components/PagePresentationModal';
import { PageRenameModalLazyLoaded } from '~/client/components/PageRenameModal';
import { ShortcutsModalLazyLoaded } from '~/client/components/ShortcutsModal';
import { PageBulkExportSelectModalLazyLoaded } from '~/features/page-bulk-export/client/components';

import { RawLayout } from './RawLayout';

import styles from './BasicLayout.module.scss';

const AiAssistantSidebar = dynamic(
  () =>
    import(
      '~/features/openai/client/components/AiAssistant/AiAssistantSidebar/AiAssistantSidebar'
    ).then((mod) => mod.AiAssistantSidebar),
  { ssr: false },
);

const moduleClass = styles['grw-basic-layout'] ?? '';

const Sidebar = dynamic(
  () => import('~/client/components/Sidebar').then((mod) => mod.Sidebar),
  { ssr: false },
);

const AlertSiteUrlUndefined = dynamic(
  () =>
    import('~/client/components/AlertSiteUrlUndefined').then(
      (mod) => mod.AlertSiteUrlUndefined,
    ),
  { ssr: false },
);
const DeleteAttachmentModal = dynamic(
  () =>
    import('~/client/components/PageAttachment/DeleteAttachmentModal').then(
      (mod) => mod.DeleteAttachmentModal,
    ),
  { ssr: false },
);
const HotkeysManager = dynamic(
  () => import('~/client/components/Hotkeys/HotkeysManager'),
  { ssr: false },
);
const GrowiNavbarBottom = dynamic(
  () =>
    import('~/client/components/Navbar/GrowiNavbarBottom').then(
      (mod) => mod.GrowiNavbarBottom,
    ),
  { ssr: false },
);
const SystemVersion = dynamic(
  () => import('~/client/components/SystemVersion'),
  { ssr: false },
);
const PutbackPageModal = dynamic(
  () => import('~/client/components/PutbackPageModal'),
  { ssr: false },
);
// Page modals
const PageCreateModal = dynamic(
  () => import('~/client/components/PageCreateModal'),
  { ssr: false },
);
const DeleteBookmarkFolderModal = dynamic(
  () =>
    import('~/client/components/DeleteBookmarkFolderModal').then(
      (mod) => mod.DeleteBookmarkFolderModal,
    ),
  { ssr: false },
);
const SearchModal = dynamic(
  () => import('~/features/search/client/components/SearchModal'),
  { ssr: false },
);
const AiAssistantManagementModal = dynamic(
  () =>
    import(
      '~/features/openai/client/components/AiAssistant/AiAssistantManagementModal/AiAssistantManagementModal'
    ).then((mod) => mod.AiAssistantManagementModal),
  { ssr: false },
);
const PageSelectModal = dynamic(
  () =>
    import('~/client/components/PageSelectModal/PageSelectModal').then(
      (mod) => mod.PageSelectModal,
    ),
  { ssr: false },
);

type Props = {
  children?: ReactNode;
  className?: string;
};

export const BasicLayout = ({ children, className }: Props): JSX.Element => {
  return (
    <RawLayout className={`${moduleClass} ${className ?? ''}`}>
      <div className="page-wrapper flex-row">
        <div className="z-2 d-print-none">
          <Sidebar />
        </div>

        <div className="d-flex flex-grow-1 flex-column mw-0 z-1">
          {/* neccessary for nested {children} make expanded */}
          <AlertSiteUrlUndefined />
          {children}
        </div>

        <AiAssistantSidebar />
      </div>

      <GrowiNavbarBottom />
      <SearchModal />

      <PageCreateModal />
      <PageDuplicateModalLazyLoaded />
      <PageDeleteModalLazyLoaded />
      <PageRenameModalLazyLoaded />
      <PageAccessoriesModalLazyLoaded />
      <DeleteAttachmentModal />
      <DeleteBookmarkFolderModal />
      <PutbackPageModal />
      <PageSelectModal />
      <AiAssistantManagementModal />

      <PagePresentationModalLazyLoaded />
      <HotkeysManager />

      <ShortcutsModalLazyLoaded />
      <PageBulkExportSelectModalLazyLoaded />
      <GrantedGroupsInheritanceSelectModalLazyLoaded />
      <SystemVersion showShortcutsButton />
    </RawLayout>
  );
};
