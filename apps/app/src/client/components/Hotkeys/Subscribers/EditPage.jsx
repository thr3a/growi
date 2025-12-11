import { useEffect } from 'react';

import PropTypes from 'prop-types';

import { useStartEditing } from '~/client/services/use-start-editing';
import { useCurrentPathname } from '~/states/global';
import { useIsEditable, useCurrentPagePath } from '~/states/page';
import { useEditorMode } from '~/states/ui/editor';

const EditPage = (props) => {
  const isEditable = useIsEditable();
  const { setEditorMode } = useEditorMode();
  const startEditing = useStartEditing();
  const currentPagePath = useCurrentPagePath();
  const currentPathname = useCurrentPathname();
  const path = currentPagePath ?? currentPathname;

  // setup effect
  useEffect(() => {
    (async () => {
      if (!isEditable) {
        return;
      }

      // ignore when dom that has 'modal in' classes exists
      if (document.getElementsByClassName('modal in').length > 0) {
        return;
      }

      try {
        await startEditing(path);
      }
      catch (err) {
      //
      }

      // remove this
      props.onDeleteRender(this);
    })();
  }, [startEditing, isEditable, path, props, setEditorMode]);

  return null;
};

EditPage.propTypes = {
  onDeleteRender: PropTypes.func.isRequired,
};

EditPage.getHotkeyStrokes = () => {
  return [['e']];
};

export default EditPage;
