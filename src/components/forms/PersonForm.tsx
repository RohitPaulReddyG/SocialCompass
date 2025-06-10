
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ManagedPerson, RelationshipType } from "@/lib/types";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";

const relationshipTypes: RelationshipType[] = ['Friend', 'Family', 'Colleague', 'Acquaintance', 'Other'];

const formSchema = z.object({
  name: z.string().min(1, { message: "Name is required." }).max(100, {message: "Name cannot exceed 100 characters."}),
  relationshipType: z.enum(relationshipTypes, {
    required_error: "Please select a relationship type.",
  }),
  customRelationshipType: z.string().max(50, {message: "Custom type cannot exceed 50 characters."}).optional(),
  notes: z.string().max(500, {message: "Notes cannot exceed 500 characters."}).optional(),
}).refine(data => {
    if (data.relationshipType === 'Other' && (!data.customRelationshipType || data.customRelationshipType.trim() === '')) {
      return false;
    }
    return true;
  }, {
    message: "Custom relationship type is required when 'Other' is selected.",
    path: ["customRelationshipType"], 
  });

type PersonFormValues = Omit<ManagedPerson, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;

interface PersonFormProps {
  onSubmit: (data: PersonFormValues) => Promise<void>;
  initialData?: ManagedPerson | null;
  isSaving: boolean;
}

export function PersonForm({ onSubmit, initialData, isSaving }: PersonFormProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name || "",
      relationshipType: initialData?.relationshipType || 'Friend',
      customRelationshipType: initialData?.customRelationshipType || "",
      notes: initialData?.notes || "",
    },
  });

  const watchedRelationshipType = form.watch("relationshipType");

  useEffect(() => {
    if (initialData) {
      form.reset({
        name: initialData.name,
        relationshipType: initialData.relationshipType,
        customRelationshipType: initialData.customRelationshipType || "",
        notes: initialData.notes || "",
      });
    } else {
        form.reset({
            name: "",
            relationshipType: 'Friend',
            customRelationshipType: "",
            notes: "",
        })
    }
  }, [initialData, form]);

  const handleFormSubmit = (data: z.infer<typeof formSchema>) => {
    const submissionData: PersonFormValues = {
        name: data.name,
        relationshipType: data.relationshipType,
        notes: data.notes,
    };

    if (data.relationshipType === 'Other') {
      // Zod's refine ensures data.customRelationshipType is a valid string here
      submissionData.customRelationshipType = data.customRelationshipType;
    }
    // If relationshipType is not 'Other', customRelationshipType will be absent from submissionData.
    // This is correct for Firestore, as it won't try to save an undefined field.

    onSubmit(submissionData);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6 py-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Riya Sharma" {...field} disabled={isSaving} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="relationshipType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Relationship Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSaving}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select relationship type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {relationshipTypes.map(type => (
                    <SelectItem key={type} value={type} className="capitalize">
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {watchedRelationshipType === 'Other' && (
          <FormField
            control={form.control}
            name="customRelationshipType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Custom Relationship Type</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Mentor, Teammate" {...field} disabled={isSaving} />
                </FormControl>
                <FormDescription>Specify the relationship if 'Other'.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Any specific details, reminders, or observations about this person..."
                  className="resize-none"
                  rows={4}
                  {...field}
                  disabled={isSaving}
                />
              </FormControl>
              <FormDescription>Max 500 characters.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={isSaving} className="w-full sm:w-auto">
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (initialData ? 'Save Changes' : 'Add Person')}
          </Button>
        </div>
      </form>
    </Form>
  );
}
