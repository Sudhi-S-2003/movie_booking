import React from 'react';
import { TeamsPage } from '../../../components/teams/TeamsPage.js';
import { SEO } from '../../../components/common/SEO.js';

export const UserTeams: React.FC = () => {
  return (
    <>
      <SEO title="Teams Management | User Dashboard" description="Manage support agents and developer collaboration teams." />
      <TeamsPage />
    </>
  );
};
