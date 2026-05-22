import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-40" />
        <Skeleton className="mt-2 h-4 w-56" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-5"><Skeleton className="h-4 w-24" /><Skeleton className="mt-3 h-8 w-16" /></Card>
        ))}
      </div>
      <Card className="p-6">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="mt-2 h-4 w-64" />
        <div className="mt-6 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (<Skeleton key={i} className="h-10 w-full" />))}
        </div>
      </Card>
    </div>
  );
}
