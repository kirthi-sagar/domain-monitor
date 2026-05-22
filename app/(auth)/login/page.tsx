import Link from "next/link";
import { loginAction } from "../actions";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-md">
        <Link href="/" className="flex justify-center mb-6"><Logo /></Link>
        <Card className="p-2">
          <CardHeader>
            <CardTitle className="text-2xl">Welcome back</CardTitle>
            <CardDescription>Sign in to your workspace.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={loginAction} className="space-y-4">
              <input type="hidden" name="next" value={next ?? "/dashboard"} />
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" autoComplete="email" required />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link href="/reset" className="text-xs text-primary hover:underline">Forgot?</Link>
                </div>
                <Input id="password" name="password" type="password" autoComplete="current-password" required />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full">Sign in</Button>
            </form>
            <p className="mt-6 text-center text-sm text-muted-foreground">
              New to Sentinel? <Link href="/signup" className="text-primary hover:underline font-medium">Create an account</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
