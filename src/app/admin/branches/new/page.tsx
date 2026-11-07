"use client";

import BranchForm from "@/components/dash/BranchForm";
import { PageHeader } from "@/components/dash/kit";

export default function NewBranchPage() {
  return (
    <>
      <PageHeader title="Add a branch" subtitle="You can change any of this later." />
      <BranchForm />
    </>
  );
}
