"use client";

import { useParams } from "next/navigation";
import { admin } from "@/lib/adminApi";
import { useApi } from "@/lib/useApi";
import MenuItemForm from "@/components/dash/MenuItemForm";
import { PageHeader } from "@/components/dash/kit";
import { ErrorState, Spinner } from "@/components/ui";

export default function EditDishPage() {
  const { id } = useParams<{ id: string }>();
  const item = useApi(() => admin.menu.get(id), id);
  const cats = useApi(() => admin.categories.list(), "cats");
  const branches = useApi(() => admin.branches.list(), "branches");
  if (item.loading || cats.loading || branches.loading) return <Spinner />;
  if (item.error || !item.data || cats.error || branches.error) return <ErrorState message={item.error || cats.error || branches.error || "Dish not found"} onRetry={() => { item.reload(); cats.reload(); branches.reload(); }} />;
  return (
    <>
      <PageHeader title={`Edit ${item.data.item.name}`} />
      <MenuItemForm item={item.data.item} categories={cats.data!.categories} branches={branches.data!.branches} />
    </>
  );
}
