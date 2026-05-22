import { addDomainAction } from "../actions";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";

export default function NewDomainPage() {
  return (
    <div className="mx-auto max-w-xl">
      <Card>
        <CardHeader>
          <CardTitle>Add a domain</CardTitle>
          <CardDescription>We&apos;ll run an initial WHOIS check in the background.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={addDomainAction} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Domain</Label>
              <Input id="name" name="name" placeholder="acme.com" required autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea id="notes" name="notes" placeholder="Anything your team should know" />
            </div>
            <Button type="submit">Add domain</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
