import React from 'react';

import AdminHomeContainer from '~/client/services/AdminHomeContainer';

import { withUnstatedContainers } from '../../UnstatedUtils';

type Props = {
  adminHomeContainer: AdminHomeContainer,
}

const UserStatisticsTable: React.FC<Props> = (props: Props) => {
  const { adminHomeContainer } = props;
  const userStatistics = adminHomeContainer.state.userStatistics;

  if (userStatistics == null) return null;

  return (
    <table className="table table-bordered user-stats-table">
      <tbody>
        <tr>
          <th className="col-sm-4">Total Users</th>
          <td>{ userStatistics.total }</td>
        </tr>
        <tr>
          <th className="col-sm-4">Active Users</th>
          <td>{ userStatistics.active.total }</td>
        </tr>
        <tr>
          <th className="col-sm-4">Inactive Users</th>
          <td>{ userStatistics.inactive.total }</td>
        </tr>
      </tbody>
      <style jsx>{`
    .user-stats-table {
      table-layout: fixed;
      width: 100%;
    }
    .user-stats-table th,
    .user-stats-table td {
      width: 50%;
      vertical-align: top;
    }
  `}
      </style>
    </table>
  );
};

const UserStatisticsTableWrapper = withUnstatedContainers(UserStatisticsTable, [AdminHomeContainer]);
export default UserStatisticsTableWrapper;
