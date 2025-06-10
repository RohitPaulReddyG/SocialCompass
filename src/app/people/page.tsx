
"use client";

import { useState, useEffect, type FC } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PlusCircle, Users, Edit, Trash2, Loader2, AlertTriangle } from 'lucide-react';
import ProtectedPage from '@/components/auth/ProtectedPage';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, orderBy, getDocs, doc, updateDoc, deleteDoc, Timestamp, serverTimestamp, where } from 'firebase/firestore';
import type { ManagedPerson, RelationshipType } from '@/lib/types';
import { PersonForm } from '@/components/forms/PersonForm';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { formatDistanceToNow } from 'date-fns';


const PeoplePage: FC = () => {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [people, setPeople] = useState<ManagedPerson[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingPerson, setEditingPerson] = useState<ManagedPerson | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [hasFetchedOnce, setHasFetchedOnce] = useState(false);

  useEffect(() => {
    if (user && user.uid && !authLoading) {
      setIsLoadingData(true);
      const fetchPeople = async () => {
        try {
          const peopleCol = collection(db, 'users', user.uid, 'managedPeople');
          const q = query(peopleCol, orderBy('name', 'asc'));
          const querySnapshot = await getDocs(q);
          const fetchedPeople = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
              ...data,
              id: doc.id,
              createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
              updatedAt: (data.updatedAt as Timestamp)?.toDate() || new Date(),
            } as ManagedPerson;
          });
          setPeople(fetchedPeople);
        } catch (error) {
          console.error("Error fetching people: ", error);
          toast({ title: "Error", description: "Could not fetch your list of people.", variant: "destructive" });
        } finally {
          setIsLoadingData(false);
          setHasFetchedOnce(true);
        }
      };
      fetchPeople();
    } else if (!authLoading && !user) {
      setPeople([]);
      setIsLoadingData(false);
      setHasFetchedOnce(true);
    }
  }, [user, authLoading, toast]);

  const handleFormSubmit = async (personData: Omit<ManagedPerson, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (!user || !user.uid) {
      toast({ title: "Error", description: "You must be logged in.", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      const peopleCol = collection(db, 'users', user.uid, 'managedPeople');
      if (editingPerson) {
        const personDocRef = doc(db, 'users', user.uid, 'managedPeople', editingPerson.id);
        const updatedData = { ...personData, updatedAt: serverTimestamp() };
        await updateDoc(personDocRef, updatedData);
        setPeople(prev => prev.map(p => p.id === editingPerson.id ? { ...p, ...personData, updatedAt: new Date() } : p).sort((a,b) => a.name.localeCompare(b.name)));
        toast({ title: "Person Updated", description: `${personData.name}'s profile has been updated.` });
      } else {
        const newPersonData = { 
          ...personData, 
          userId: user.uid, 
          createdAt: serverTimestamp(), 
          updatedAt: serverTimestamp() 
        };
        const docRef = await addDoc(peopleCol, newPersonData);
        const newPersonForState: ManagedPerson = {
            ...personData,
            id: docRef.id,
            userId: user.uid,
            createdAt: new Date(), 
            updatedAt: new Date(), 
        };
        setPeople(prev => [...prev, newPersonForState].sort((a,b) => a.name.localeCompare(b.name)));
        toast({ title: "Person Added", description: `${personData.name} has been added to your list.` });
      }
      setEditingPerson(null);
      setIsDialogOpen(false);
    } catch (error) {
      console.error("Error saving person: ", error);
      toast({ title: "Error", description: "Could not save person's details.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePerson = async (personId: string, personName: string) => {
    if (!user || !user.uid) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'managedPeople', personId));
      setPeople(prev => prev.filter(p => p.id !== personId));
      toast({ title: "Person Deleted", description: `${personName} has been removed from your list.` });
    } catch (error) {
      console.error("Error deleting person: ", error);
      toast({ title: "Error", description: `Could not delete ${personName}.`, variant: "destructive" });
    }
  };

  const openAddDialog = () => {
    setEditingPerson(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (person: ManagedPerson) => {
    setEditingPerson(person);
    setIsDialogOpen(true);
  };
  
  const getRelationshipDisplay = (person: ManagedPerson) => {
    if (person.relationshipType === 'Other' && person.customRelationshipType) {
      return person.customRelationshipType;
    }
    return person.relationshipType;
  };

  return (
    <ProtectedPage>
      <div className="space-y-8">
        <Card className="shadow-xl rounded-xl animate-in fade-in-50 duration-300">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold flex items-center gap-2">
                <Users className="text-primary h-7 w-7" />
                Manage People
              </CardTitle>
              <CardDescription>
                Keep track of people you interact with and their details.
              </CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openAddDialog} disabled={authLoading || !user}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Person
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px] md:max-w-lg">
                <DialogHeader>
                  <DialogTitle>{editingPerson ? 'Edit Person' : 'Add New Person'}</DialogTitle>
                  <DialogDescription>
                    {editingPerson ? `Update details for ${editingPerson.name}.` : 'Add a new person to your list.'}
                  </DialogDescription>
                </DialogHeader>
                <PersonForm
                  onSubmit={handleFormSubmit}
                  initialData={editingPerson}
                  isSaving={isSaving}
                />
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {(isLoadingData && !hasFetchedOnce) || authLoading ? (
              <div className="flex justify-center items-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-2 text-muted-foreground">Loading people...</p>
              </div>
            ) : people.length === 0 && hasFetchedOnce ? (
              <div className="text-center py-10 animate-in fade-in-50 duration-500">
                <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground text-lg">Your people list is empty.</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Click "Add Person" above to start building your social compass.
                </p>
                 <Button onClick={openAddDialog} className="mt-4">
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Your First Person
                </Button>
              </div>
            ) : (
              <ScrollArea className="h-[calc(100vh-20rem)] md:h-[calc(100vh-22rem)]">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-1">
                  {people.map((person) => (
                    <Card key={person.id} className="shadow-md rounded-lg hover:shadow-lg transition-shadow duration-200 flex flex-col">
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-xl">{person.name}</CardTitle>
                          <Badge variant="secondary" className="capitalize">{getRelationshipDisplay(person)}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="flex-grow space-y-2 text-sm">
                        {person.notes && (
                          <p className="text-muted-foreground line-clamp-3">
                            <strong className="text-foreground">Notes:</strong> {person.notes}
                          </p>
                        )}
                         {!person.notes && (
                            <p className="text-muted-foreground italic">No notes added.</p>
                        )}
                        <p className="text-xs text-muted-foreground pt-2">
                          Last updated: {formatDistanceToNow(person.updatedAt, { addSuffix: true })}
                        </p>
                      </CardContent>
                      <CardFooter className="pt-3 border-t mt-auto">
                        <Button variant="outline" size="sm" onClick={() => openEditDialog(person)} className="mr-2">
                          <Edit className="mr-1 h-3 w-3" /> Edit
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm">
                              <Trash2 className="mr-1 h-3 w-3" /> Delete
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete {person.name}'s profile.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeletePerson(person.id, person.name)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </ProtectedPage>
  );
};

export default PeoplePage;
