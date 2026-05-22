import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export default function Loading() {
  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="flex gap-2"><Skeleton className="h-8 w-24" /><Skeleton className="h-8 w-8" /></div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-5"><Skeleton className="h-4 w-16" /><Skeleton className="mt-3 h-7 w-24" /></Card>
        ))}
      </div>
      <Card className="p-6"><Skeleton className="h-5 w-40" /><div className="mt-4 space-y-2">{Array.from({ length: 3 }).map((_, i) => (<Skeleton key={i} className="h-12 w-full" />))}</div></Card>
    </div>
  );
}
