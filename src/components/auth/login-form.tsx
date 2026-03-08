"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { loginAction } from "@/app/login/actions";

export function LoginForm() {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await loginAction(formData);
      if (result?.error) {
        toast.error(result.error);
      }
    });
  }

  return (
    <Card className="w-[400px] max-w-full">
      <CardHeader className="text-center space-y-4">
        <div className="space-y-1">
          <p className="text-3xl font-bold tracking-tight">CRM</p>
          <p className="text-sm text-muted-foreground">System</p>
        </div>
        <Separator />
        <div className="space-y-2">
          <CardTitle>Sign in</CardTitle>
          <CardDescription>
            Enter your credentials to access your account
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              name="username"
              type="text"
              required
              placeholder="Enter your username"
              disabled={isPending}
              autoComplete="username"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              placeholder="Enter your password"
              disabled={isPending}
              autoComplete="current-password"
            />
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                <Lock className="size-4" />
                Sign in
              </>
            )}
          </Button>
          <div className="text-center">
            <Link
              href="/forgot-password"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Forgot password?
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
