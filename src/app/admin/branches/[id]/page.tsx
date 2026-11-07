"use client";

import { useParams } from "next/navigation";
import { admin } from "@/lib/adminApi";
import { useApi } from "@/lib/useApi";
import BranchForm from "@/components/dash/BranchForm";
import { PageHeader } from "@/components/dash/kit";
import { ErrorState, Spinner } from "@/components/ui";

export default function EditBranchPage() {
  const { id } = useParams<{ id: string }>();
  const { data, loading, error, reload } = useApi(() => admin.branches.get(id), id);
  if (loading) return <Spinner />;
  if (error || !data) return <ErrorState message={error || "Branch not found"} onRetry={() => reload()} />;
  return (
    <>
      <PageHeader title={`Edit ${data.branch.name}`} />
      <BranchForm branch={data.branch} />
    </>
  );
}
