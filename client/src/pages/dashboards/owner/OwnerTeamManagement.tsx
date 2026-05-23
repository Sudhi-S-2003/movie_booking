import React from 'react';
import { TeamManagementPage } from '../../../components/teams/TeamManagementPage.js';
import { SEO } from '../../../components/common/SEO.js';

export const OwnerTeamManagement: React.FC = () => {
  return (
    <>
      <SEO title="Team Management | Owner Dashboard" description="Configure team members and collaborate." />
      <TeamManagementPage />
    </>
  );
};
