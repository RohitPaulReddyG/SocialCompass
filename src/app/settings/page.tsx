
"use client";

import ProtectedPage from '@/components/auth/ProtectedPage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings as SettingsIcon, Palette, UserCircle, LogOut, Database, AlertTriangle, Download, Trash2, Loader2, Save } from 'lucide-react';
import { useTheme, type Theme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useState, useEffect } from 'react';
import { exportUserDataAction, deleteUserAllDataAction } from './actions';

export default function SettingsPage() {
  const { theme, setTheme } = useTheme(); // Removed effectiveTheme, not directly used here.
  const { user, logout, updateUserDisplayName, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [displayNameInput, setDisplayNameInput] = useState(user?.displayName || '');
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (user?.displayName) {
      setDisplayNameInput(user.displayName);
    } else {
      setDisplayNameInput(''); // Reset if user logs out or displayName is null
    }
  }, [user?.displayName]);


  const handleUpdateName = async () => {
    if (!user) {
      toast({ title: "Error", description: "You must be logged in.", variant: "destructive" });
      return;
    }
    if (!displayNameInput.trim()) {
        toast({ title: "Error", description: "Display name cannot be empty.", variant: "destructive" });
        return;
    }
    setIsUpdatingName(true);
    try {
      await updateUserDisplayName(displayNameInput.trim());
      // Toast for success is handled within updateUserDisplayName in AuthContext
    } catch (error) {
      // Toast for error is handled within updateUserDisplayName in AuthContext
    } finally {
      setIsUpdatingName(false);
    }
  };

  const handleExportData = async () => {
    if (!user || !user.uid) {
      toast({ title: "Error", description: "You must be logged in to export data.", variant: "destructive" });
      return;
    }
    setIsExporting(true);
    toast({ title: "Exporting Data...", description: "Please wait while we prepare your data." });
    
    const result = await exportUserDataAction(user.uid);

    if (result.success && result.data) {
      try {
        const blob = new Blob([result.data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `social-compass-data-${user.uid}-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast({ title: "Data Exported Successfully", description: "Your data has been downloaded." });
      } catch (e) {
        console.error("Client-side export error:", e);
        toast({ title: "Export Error", description: "Could not trigger download. Check console.", variant: "destructive" });
      }
    } else {
      toast({ title: "Export Failed", description: result.error || "An unknown error occurred.", variant: "destructive" });
    }
    setIsExporting(false);
  };

  const handleDeleteAccountData = async () => {
    if (!user || !user.uid) {
      toast({ title: "Error", description: "You must be logged in to delete data.", variant: "destructive" });
      return;
    }
    setIsDeleting(true);
    toast({ title: "Deleting Data...", description: "This may take a moment. Please wait." });

    const result = await deleteUserAllDataAction(user.uid);

    if (result.success) {
      toast({ title: "Data Deleted Successfully", description: "All your application data has been removed. Logging you out." });
      await logout(); 
    } else {
      toast({ title: "Deletion Failed", description: result.error || "An unknown error occurred.", variant: "destructive" });
      setIsDeleting(false);
    }
  };

  return (
    <ProtectedPage>
      <div className="space-y-8 max-w-2xl mx-auto">
        <Card className="shadow-xl rounded-xl animate-in fade-in-50 duration-300">
          <CardHeader>
            <CardTitle className="text-3xl font-bold flex items-center gap-3">
              <SettingsIcon className="text-primary h-8 w-8" />
              Settings
            </CardTitle>
            <CardDescription>
              Manage your application preferences and account settings.
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Profile Settings */}
        <Card className="shadow-lg rounded-xl animate-in fade-in-50 duration-500">
          <CardHeader>
            <CardTitle className="text-xl font-semibold flex items-center gap-2">
              <UserCircle className="text-accent h-6 w-6" />
              Profile
            </CardTitle>
            <CardDescription>Manage how you appear in the app.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="displayName" className="font-medium">Display Name</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  id="displayName"
                  type="text"
                  placeholder="Enter your display name"
                  value={displayNameInput}
                  onChange={(e) => setDisplayNameInput(e.target.value)}
                  disabled={isUpdatingName || authLoading}
                  className="flex-grow"
                />
                <Button onClick={handleUpdateName} disabled={isUpdatingName || authLoading || displayNameInput === (user?.displayName || '')}>
                  {isUpdatingName ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  <span className="ml-2 sm:inline hidden">Save Name</span>
                </Button>
              </div>
               <p className="text-xs text-muted-foreground pt-1">This name will be used by AI features to address you.</p>
            </div>
          </CardContent>
        </Card>

        {/* Appearance Settings */}
        <Card className="shadow-lg rounded-xl animate-in fade-in-50 duration-500">
          <CardHeader>
            <CardTitle className="text-xl font-semibold flex items-center gap-2">
              <Palette className="text-accent h-6 w-6" />
              Appearance
            </CardTitle>
            <CardDescription>Customize the look and feel of the application.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Label className="font-medium">Theme</Label>
            <RadioGroup
              value={theme}
              onValueChange={(value) => setTheme(value as Theme)}
              className="grid grid-cols-1 sm:grid-cols-3 gap-4"
            >
              <Label htmlFor="theme-light" className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary cursor-pointer">
                <RadioGroupItem value="light" id="theme-light" className="sr-only" />
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-3 h-6 w-6"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="m4.93 4.93 1.41 1.41"></path><path d="m17.66 17.66 1.41 1.41"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="m6.34 17.66-1.41 1.41"></path><path d="m19.07 4.93-1.41 1.41"></path></svg>
                Light
              </Label>
              <Label htmlFor="theme-dark" className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary cursor-pointer">
                <RadioGroupItem value="dark" id="theme-dark" className="sr-only" />
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-3 h-6 w-6"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path></svg>
                Dark
              </Label>
              <Label htmlFor="theme-system" className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary cursor-pointer">
                <RadioGroupItem value="system" id="theme-system" className="sr-only" />
                 <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-3 h-6 w-6"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"></rect><path d="M12 18h.01"></path></svg>
                System
              </Label>
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Account Settings */}
        <Card className="shadow-lg rounded-xl animate-in fade-in-50 duration-700">
          <CardHeader>
            <CardTitle className="text-xl font-semibold flex items-center gap-2">
              <UserCircle className="text-accent h-6 w-6" /> 
              Account
            </CardTitle>
            <CardDescription>Manage your account-level settings.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="email" className="font-medium">Email</Label>
              <p id="email" className="text-sm text-muted-foreground pt-1">
                {user?.email || 'No email associated with this account.'}
              </p>
            </div>
            <Separator />
            <Button variant="outline" onClick={logout} className="w-full sm:w-auto">
              <LogOut className="mr-2 h-4 w-4" /> Log Out
            </Button>
          </CardContent>
        </Card>

        {/* Data Management Settings */}
        <Card className="shadow-lg rounded-xl animate-in fade-in-50 duration-900">
          <CardHeader>
            <CardTitle className="text-xl font-semibold flex items-center gap-2">
              <Database className="text-accent h-6 w-6" />
              Data Management
            </CardTitle>
            <CardDescription>Manage your application data.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={handleExportData} variant="outline" className="w-full sm:w-auto" disabled={isExporting || !user || authLoading}>
              {isExporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Exporting...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" /> Export My Data
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground">
              Download all your interactions, journal entries, managed people, and stats.
            </p>
            <Separator />
             <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full sm:w-auto" disabled={isDeleting || !user || authLoading}>
                  <Trash2 className="mr-2 h-4 w-4" /> Delete All My Data
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete all your
                    interactions, journal entries, managed people, and other account data from Social Compass.
                    Your user account itself will remain, but all associated application data will be erased.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteAccountData} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                    {isDeleting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...
                      </>
                    ) : (
                      "Yes, delete all my data"
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
             <p className="text-xs text-muted-foreground">
              Permanently remove all your application data from Social Compass.
            </p>
          </CardContent>
        </Card>
      </div>
    </ProtectedPage>
  );
}
