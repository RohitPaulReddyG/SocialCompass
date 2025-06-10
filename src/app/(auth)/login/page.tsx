
"use client";

import { useEffect, type FC } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useAuth } from '@/contexts/AuthContext';
import { Compass, Loader2, Mail, Lock } from 'lucide-react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Separator } from '@/components/ui/separator';

const loginFormSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(1, { message: "Password is required." }),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

const LoginPage: FC = () => {
  const { user, loginWithGoogle, loginWithEmail, loading } = useAuth();
  const router = useRouter();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    if (user && !loading) {
      router.push('/'); 
    }
  }, [user, loading, router]);

  const onSubmit = async (data: LoginFormValues) => {
    try {
      await loginWithEmail(data.email, data.password);
      // Successful login is handled by onAuthStateChanged in AuthContext
    } catch (error) {
      // Error is handled by toast in AuthContext, form can show specific field errors if needed
      // form.setError("root", { message: "Login failed. Please check your credentials."});
    }
  };

  if (loading && !user) { // Show loader if initially loading auth state and no user yet
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  // If user becomes available while loading, onAuthStateChanged will redirect via useEffect

  return (
    <Card className="w-full max-w-sm shadow-xl rounded-xl">
      <CardHeader className="text-center">
        <Compass className="mx-auto h-12 w-12 text-primary mb-4" />
        <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
        <CardDescription>Sign in to navigate your social world.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1"><Mail className="h-4 w-4 text-muted-foreground" />Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="you@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1"><Lock className="h-4 w-4 text-muted-foreground" />Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {form.formState.errors.root && (
              <p className="text-sm font-medium text-destructive">{form.formState.errors.root.message}</p>
            )}
            <Button type="submit" className="w-full" disabled={loading || form.formState.isSubmitting}>
              {form.formState.isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
        </Form>
        
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Or continue with
            </span>
          </div>
        </div>

        <Button onClick={loginWithGoogle} variant="outline" className="w-full" disabled={loading}>
          {loading && !form.formState.isSubmitting ? ( // only show main loader if not email/pass submittin
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <>
              <svg aria-hidden="true" className="mr-2 h-4 w-4" width="18" height="18" viewBox="0 0 18 18"><path d="M16.51 8.25H16.51C16.51 8.25 16.51 8.25 16.51 8.25C16.51 8.25 16.51 8.25 16.51 8.25V8.25C16.51 8.25 16.51 8.25 16.51 8.25C16.51 7.71741 16.3006 7.20605 15.9223 6.82772C15.5439 6.44939 15.0326 6.24 14.5 6.24H9V9.75H13.3012C13.1049 10.5737 12.636 11.3072 11.9855 11.7866C11.335 12.2659 10.5442 12.4608 9.75 12.42C8.3475 12.42 7.14 11.52 6.63 10.35H3.045V12.75C3.80554 14.0663 5.01956 15.1024 6.49008 15.6931C7.9606 16.2838 9.60366 16.3898 11.16 15.99C12.3658 15.6868 13.4617 15.0922 14.355 14.2725C15.0563 13.6461 15.6037 12.8806 15.96 12V11.9625C16.32 11.2237 16.5125 10.4062 16.5125 9.57375C16.5125 9.12 16.5125 8.67375 16.51 8.25Z" fill="#FFC107"></path><path d="M3.045 12.75H3.045C3.045 12.75 3.045 12.75 3.045 12.75C3.045 12.75 3.045 12.75 3.045 12.75V12.75C3.70766 13.9312 4.72051 14.9028 5.94516 15.5211C5.5289 15.7914 5.07645 15.9964 4.60492 16.1305C4.13339 16.2645 3.64883 16.3252 3.165 16.3087C2.68117 16.2923 2.20283 16.1989 1.755 16.035C0.854999 15.6975 0.142499 14.91 0 13.95V13.95C0 13.95 0 13.95 0 13.95C0 13.95 0 13.95 0 13.95V13.95C0 12.4725 0.525 11.115 1.3875 10.05H1.3875L1.395 10.0575L3.045 7.2375V12.75Z" fill="#FF3D00"></path><path d="M16.5125 8.25H9V6.24H14.5C14.0029 5.00027 13.1488 3.96893 12.0525 3.27C11.0326 2.61361 9.82392 2.24987 8.595 2.24987C6.6 2.24987 4.845 3.26237 3.915 4.96487L1.2075 2.73737C2.07216 1.40526 3.37084 0.441287 4.88282 0.0370002C6.3948 -0.367287 8.00012 -0.18611 9.405 0.547374C10.8102 1.28051 11.9397 2.34888 12.6225 3.61487C13.4183 4.69559 13.9304 5.95958 14.1075 7.29002C14.1452 7.58788 14.1637 7.88919 14.1637 8.19002C14.1637 8.21267 14.1637 8.23576 14.1637 8.25841C14.1637 8.25643 14.1637 8.25445 14.1637 8.25247C14.1637 8.25165 14.1637 8.25082 14.1637 8.25H16.5125V8.25Z" fill="#4CAF50"></path><path d="M16.51 8.25H9V9.75H13.3012C12.9895 10.8455 12.2856 11.7719 11.325 12.3637C11.0615 12.5363 10.7814 12.6791 10.4894 12.7882C10.1973 12.8972 9.89549 12.9713 9.58875 13.0087L9.75 12.42C10.5442 12.4608 11.335 12.2659 11.9855 11.7866C12.636 11.3072 13.1049 10.5737 13.3012 9.75H9V8.25H16.51Z" fill="#1976D2"></path></svg>
              Sign in with Google
            </>
          )}
        </Button>
      </CardContent>
      <CardFooter className="flex justify-center text-sm">
        <p className="text-muted-foreground">Don&apos;t have an account?&nbsp;</p>
        <Link href="/signup" className="font-medium text-primary hover:underline">
          Sign Up
        </Link>
      </CardFooter>
    </Card>
  );
};

export default LoginPage;
