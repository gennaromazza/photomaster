import React from 'react';
import { ClausesManagement } from '@/components/clauses/ClausesManagement';
import { AppLayout } from '@/components/layout/AppLayout';
import { Helmet } from 'react-helmet';

export default function ClausesPage() {
  return (
    <AppLayout>
      <Helmet>
        <title>Gestione Clausole | Studio Master</title>
      </Helmet>
      <ClausesManagement />
    </AppLayout>
  );
}