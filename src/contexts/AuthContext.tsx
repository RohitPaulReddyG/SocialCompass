
"use client";

import type { User } from 'firebase/auth';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { auth, googleProvider } from '@/lib/firebase';
import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUserDisplayName: (newName: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      if (currentUser) {
        if (router.pathname === '/login' || router.pathname === '/signup') {
          router.push('/');
        }
      }
    });
    return () => unsubscribe();
  }, [router]);

  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      toast({ title: "Signed in with Google successfully!"});
    } catch (error: any) {
      console.error("Error signing in with Google: ", error);
      toast({ title: "Google Sign-In Error", description: error.message || "Could not sign in with Google.", variant: "destructive"});
    }
  };

  const loginWithEmail = async (email: string, password: string) => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({ title: "Signed in successfully!"});
    } catch (error: any) {
      console.error("Error signing in with email: ", error);
      toast({ title: "Sign-In Error", description: error.message || "Invalid email or password.", variant: "destructive"});
      throw error; 
    }
  };

  const signUpWithEmail = async (email: string, password: string) => {
    setLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      toast({ title: "Account created successfully! Redirecting..."});
    } catch (error: any) {
      console.error("Error signing up with email: ", error);
      toast({ title: "Sign-Up Error", description: error.message || "Could not create account.", variant: "destructive"});
      throw error; 
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      setUser(null);
      toast({ title: "Logged out."});
      router.push('/login'); 
    } catch (error: any) {
      console.error("Error signing out: ", error);
      toast({ title: "Logout Error", description: error.message, variant: "destructive"});
    } finally {
      setLoading(false);
    }
  };

  const updateUserDisplayName = async (newName: string) => {
    if (!auth.currentUser) {
      toast({ title: "Error", description: "You must be logged in to update your name.", variant: "destructive" });
      throw new Error("User not authenticated");
    }
    try {
      await updateProfile(auth.currentUser, { displayName: newName });
      // Update local user state to reflect the change immediately
      setUser(prevUser => {
        if (prevUser) {
          // Create a new user object with the updated displayName
          // This is important because User object is immutable in Firebase SDK
          // and we need to trigger re-renders.
           const updatedUser = { ...prevUser, displayName: newName } as User;
           return updatedUser;
        }
        return null;
      });
      toast({ title: "Success", description: "Your display name has been updated." });
    } catch (error: any) {
      console.error("Error updating display name: ", error);
      toast({ title: "Error", description: error.message || "Could not update display name.", variant: "destructive" });
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginWithGoogle, loginWithEmail, signUpWithEmail, logout, updateUserDisplayName }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
