"use client";

import { admin } from "@/lib/adminApi";
import { useApi } from "@/lib/useApi";
import MenuItemForm from "@/components/dash/MenuItemForm";
import { PageHeader } from "@/components/dash/kit";
import { EmptyState, ErrorState, LinkButton, Spinner } from "@/components/ui";
import { FolderPlus } from "lucide-react";

export default function NewDishPage() {
  const cats = useApi(() => admin.categories.list(), "cats");
  const branches = useApi(() => admin.branches.list(), "branches");
  if (cats.loading || branches.loading) return <Spinner />;
  if (cats.error || branches.error) return <ErrorState message={cats.error || branches.error || ""} onRetry={() => { cats.reload(); branches.reload(); }} />;
  if ((cats.data?.categories.length ?? 0) === 0)
    return <EmptyState icon={<FolderPlus size={28} />} title="Create a category first" text="Dishes need a category, like Rice or Drinks." action={<LinkButton href="/admin/menu">Go to Categories</LinkButton>} />;
  return (
    <>
      <PageHeader title="Add a dish" />
      <MenuItemForm categories={cats.data!.categories} branches={branches.data!.branches} />
    </>
  );
}
