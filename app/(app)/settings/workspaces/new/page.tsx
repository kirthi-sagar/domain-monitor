import Link from "next/link";
import { createWorkspaceAction } from "../actions";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default async function NewWorkspacePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <div className="max-w-md">
      <Button asChild variant="ghost" size="sm" className="-ml-2 mb-3"><Link href="/settings"><ArrowLeft className="h-4 w-4" /> Settings</Link></Button>
      <Card>
        <CardHeader>
          <CardTitle>Create a workspace</CardTitle>
          <CardDescription>You&apos;ll be the owner. Domains, channels and team are scoped to the workspace.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createWorkspaceAction} className="space-y-4">
            <div className="space-y-1.5"><Label htmlFor="name">Name</Label><Input id="name" name="name" required autoFocus placeholder="Acme Brand Team" /></div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit">Create workspace</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
