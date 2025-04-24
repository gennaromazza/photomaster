import React from "react";
import PageTitle from "@/components/page-title";
import { CollaboratoriList } from "@/components/collaboratori/collaboratori-list";

export default function CollaboratoriPage() {
  return (
    <div className="container py-6 space-y-6">
      <CollaboratoriList />
    </div>
  );
}