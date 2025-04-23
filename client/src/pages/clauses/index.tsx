import React from 'react';
import { ClausesManagement } from '@/components/clauses/ClausesManagement';
import { Helmet } from 'react-helmet';

export default function ClausesPage() {
  return (
    <>
      <Helmet>
        <title>Gestione Clausole | Studio Master</title>
      </Helmet>
      <div className="container py-6">
        <ClausesManagement />
      </div>
    </>
  );
}