import React from "react";
import PageTitle from "@/components/page-title";
import { CollaboratoriList } from "@/components/collaboratori/collaboratori-list";

export default function CollaboratoriPage() {
  return (
    <div className="container py-8 space-y-8">
      <PageTitle
        title="Collaboratori"
        subtitle="Gestisci i collaboratori, eventi, pagamenti e montaggi"
      />
      <CollaboratoriList />
    </div>
  );
}