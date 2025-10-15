import type { ReactNode, JSX } from 'react';
import React from 'react';

import dynamic from 'next/dynamic';

// eslint-disable-next-line no-restricted-imports
import { ShortcutsModalDynamic } from '~/client/components/ShortcutsModal';

import { RawLayout } from './RawLayout';

const PageCreateModal = dynamic(() => import('~/client/components/PageCreateModal'), { ssr: false });
const GrowiNavbarBottom = dynamic(() => import('~/client/components/Navbar/GrowiNavbarBottom').then(mod => mod.GrowiNavbarBottom), { ssr: false });
const SystemVersion = dynamic(() => import('~/client/components/SystemVersion'), { ssr: false });


type Props = {
  children?: ReactNode
}

export const ShareLinkLayout = ({ children }: Props): JSX.Element => {
  return (
    <RawLayout>

      <div className="page-wrapper">
        {children}
      </div>

      <GrowiNavbarBottom />

      <ShortcutsModalDynamic />
      <PageCreateModal />
      <SystemVersion showShortcutsButton />
    </RawLayout>
  );
};
