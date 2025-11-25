import React, { type JSX } from 'react';

import { LoadingSpinner } from '@growi/ui/dist/components';

type EnvVarsTableProps = {
  envVars?: Record<string, string | number | boolean>,
}

export const EnvVarsTable: React.FC<EnvVarsTableProps> = (props: EnvVarsTableProps) => {
  const { envVars } = props;
  if (envVars == null) {
    return <LoadingSpinner />;
  }

  const envVarRows: JSX.Element[] = [];

  if (!props.envVars) return null;

  for (const [key, value] of Object.entries(props.envVars)) {
    if (value != null) {
      envVarRows.push(
        <tr key={key}>
          <th className="col-sm-4">{key}</th>
          <td>{value.toString()}</td>
        </tr>,
      );
    }
  }

  return (
    <table className="table table-bordered">
      <tbody>
        {envVarRows}
      </tbody>
    </table>
  );
};
