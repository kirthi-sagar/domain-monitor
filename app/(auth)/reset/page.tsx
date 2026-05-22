import Link from "next/link";
import { resetRequestAction } from "../actions";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ sent?: string; error?: string }> }) {
  const { sent, error } = await searchParams;
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-md">
        <Link href="/" className="flex justify-center mb-6"><Logo /></Link>
        <Card className="p-2">
          <CardHeader>
            <CardTitle className="text-2xl">Reset your password</CardTitle>
            <CardDescription>We&apos;ll email you a reset link.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={resetRequestAction} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" required />
              </div>
              {sent && <p className="text-sm text-emerald-700">Reset link sent. Check your inbox.</p>}
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full">Send reset link</Button>
            </form>
            <p className="mt-6 text-center text-sm text-muted-foreground">
              Remember it? <Link href="/login" className="text-primary hover:underline">Sign in</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
