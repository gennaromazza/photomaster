import React from 'react';
import { PageWrapper } from '@/components/ui/page-wrapper';
import { FinancialDashboard } from '@/components/finances/financial-dashboard';

export default function FinancesPage() {
  return (
    <PageWrapper>
      <FinancialDashboard />
    </PageWrapper>
  );
}