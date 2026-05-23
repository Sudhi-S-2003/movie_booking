import React from 'react';
import { TeamManagementPage } from '../../../components/teams/TeamManagementPage.js';
import { SEO } from '../../../components/common/SEO.js';

export const UserTeamManagement: React.FC = () => {
  return (
    <>
      <SEO title="Team Management | User Dashboard" description="Configure team members and collaborate." />
      <TeamManagementPage />
    </>
  );
};
