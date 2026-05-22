import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><Skeleton className="h-8 w-32" /><Skeleton className="mt-2 h-4 w-24" /></div>
        <Skeleton className="h-9 w-28" />
      </div>
      <Skeleton className="h-10 w-full" />
      <Card className="p-0">
        <div className="space-y-2 p-4">
          {Array.from({ length: 6 }).map((_, i) => (<Skeleton key={i} className="h-12 w-full" />))}
        </div>
      </Card>
    </div>
  );
}
