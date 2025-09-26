import type React from 'react';
import { useCallback } from 'react';

import { useSearchModalActions } from '../../states/modal/search';

type Props = {
  keywordOnInit: string;
};

export const SearchModalTriggerinput: React.FC<Props> = (props: Props) => {
  const { keywordOnInit } = props;

  const { open: openSearchModal } = useSearchModalActions();

  const inputClickHandler = useCallback(() => {
    openSearchModal(keywordOnInit);
  }, [openSearchModal, keywordOnInit]);

  return (
    <div className="d-flex align-items-center">
      <span className="text-secondary material-symbols-outlined fs-4 me-2">
        search
      </span>
      <form className="w-100 position-relative" onClick={inputClickHandler}>
        <input
          className="form-control"
          type="input"
          value={keywordOnInit}
          onClick={inputClickHandler}
          readOnly
        />
      </form>
    </div>
  );
};
