import React from 'react';
import { TeamsPage } from '../../../components/teams/TeamsPage.js';
import { SEO } from '../../../components/common/SEO.js';

export const OwnerTeams: React.FC = () => {
  return (
    <>
      <SEO title="Teams Management | Owner Dashboard" description="Manage support agents and developer collaboration teams." />
      <TeamsPage />
    </>
  );
};
