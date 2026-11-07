import type { OrderStatus } from "@/lib/types";
import { STATUS_LABEL, STATUS_TONE } from "@/lib/format";
import { Badge } from "./ui";

export default function StatusBadge({ status }: { status: OrderStatus }) {
  return <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>;
}
