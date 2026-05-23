import React from 'react';
import { TeamManagementPage } from '../../../components/teams/TeamManagementPage.js';
import { SEO } from '../../../components/common/SEO.js';

export const AdminTeamManagement: React.FC = () => {
  return (
    <>
      <SEO title="Team Management | Admin Dashboard" description="Configure team members and collaborate." />
      <TeamManagementPage />
    </>
  );
};
