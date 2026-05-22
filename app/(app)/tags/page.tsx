import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/workspace";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createTagAction, deleteTagAction } from "./actions";
import { Trash2 } from "lucide-react";

export default async function TagsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const wsId = await getCurrentWorkspaceId();

  const { data: tags } = await supabase
    .from("tags")
    .select("id, name, color")
    .eq("workspace_id", wsId ?? "")
    .order("name");

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tags</h1>
        <p className="text-sm text-muted-foreground">Organize domains into portfolios with colored labels.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Create tag</CardTitle><CardDescription>Pick a short name and a color.</CardDescription></CardHeader>
        <CardContent>
          <form action={createTagAction} className="flex flex-col sm:flex-row gap-2 items-end">
            <div className="flex-1 space-y-1.5"><Label htmlFor="name">Name</Label><Input id="name" name="name" placeholder="brand" required /></div>
            <div className="space-y-1.5"><Label htmlFor="color">Color</Label><Input id="color" name="color" type="color" defaultValue="#4338ca" className="h-10 w-16 p-1" /></div>
            <Button type="submit">Create</Button>
          </form>
          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Your tags</CardTitle></CardHeader>
        <CardContent>
          {(!tags || tags.length === 0) ? (
            <p className="text-sm text-muted-foreground">No tags yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {tags.map((t: any) => (
                <li key={t.id} className="py-3 flex items-center justify-between">
                  <span className="inline-flex items-center gap-2 rounded-full px-2.5 py-0.5 text-xs font-medium" style={{ backgroundColor: t.color + "22", color: t.color }}>
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: t.color }} />
                    {t.name}
                  </span>
                  <form action={deleteTagAction.bind(null, t.id)}>
                    <Button type="submit" size="sm" variant="ghost" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
