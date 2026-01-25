import { cn } from "@/lib/utils";
import type { SubscriptionStatus, DeliveryStatus } from "@/types";

type StatusType = SubscriptionStatus | DeliveryStatus;

interface StatusBadgeProps {
  status: StatusType;
  size?: "sm" | "md";
  className?: string;
}

const statusStyles: Record<StatusType, string> = {
  // Subscription statuses
  active: "bg-green-100 text-green-700 border-green-200",
  paused: "bg-yellow-100 text-yellow-700 border-yellow-200",
  completed: "bg-gray-100 text-gray-700 border-gray-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
  // Delivery statuses
  scheduled: "bg-gray-100 text-gray-700 border-gray-200",
  cooking: "bg-orange-100 text-orange-700 border-orange-200",
  sent: "bg-blue-100 text-blue-700 border-blue-200",
  delivered: "bg-green-100 text-green-700 border-green-200",
  skipped: "bg-yellow-100 text-yellow-700 border-yellow-200",
};

const statusLabels: Record<StatusType, string> = {
  // Subscription statuses
  active: "Active",
  paused: "Paused",
  completed: "Completed",
  cancelled: "Cancelled",
  // Delivery statuses
  scheduled: "Scheduled",
  cooking: "Cooking",
  sent: "Sent",
  delivered: "Delivered",
  skipped: "Skipped",
};

export function StatusBadge({ status, size = "md", className }: StatusBadgeProps) {
  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-2.5 py-1",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center font-medium rounded-full border",
        statusStyles[status],
        sizeClasses[size],
        className
      )}
    >
      {statusLabels[status]}
    </span>
  );
}
