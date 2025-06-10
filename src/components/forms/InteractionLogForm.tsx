
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { EventType, Interaction, ManagedPerson, Person } from "@/lib/types";
import { PartyPopper, Briefcase, User, UsersIcon, Coffee, HelpCircle, Smile, Frown, Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, type FC } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import Link from 'next/link';

const eventTypes: { value: EventType; label: string; icon: FC<React.SVGProps<SVGSVGElement>> }[] = [
  { value: "Party", label: "Party / Social Gathering", icon: PartyPopper },
  { value: "Work Meeting", label: "Work Meeting / Event", icon: Briefcase },
  { value: "One-on-One", label: "One-on-One Chat", icon: User },
  { value: "Family Gathering", label: "Family Gathering", icon: UsersIcon },
  { value: "Solo Activity", label: "Solo Activity Reflection", icon: Coffee },
  { value: "Other", label: "Other", icon: HelpCircle },
];

const formSchema = z.object({
  people: z.array(z.object({
    id: z.string(),
    name: z.string(),
  })).min(1, { message: "Please select at least one person." }),
  eventType: z.enum(["Party", "Work Meeting", "One-on-One", "Family Gathering", "Solo Activity", "Other"], {
    required_error: "Please select an event type.",
  }),
  customEventType: z.string().max(100, "Custom event type cannot exceed 100 characters.").optional(),
  feelingBefore: z.number().min(0).max(100),
  feelingAfter: z.number().min(0).max(100),
  vibe: z.string().max(50, "Vibe should be concise (max 50 chars).").optional().describe("1-3 words describing the vibe"),
  notes: z.string().max(500, "Notes cannot exceed 500 characters.").optional(),
}).refine(data => {
    if (data.eventType === 'Other' && (!data.customEventType || data.customEventType.trim() === '')) {
      return false;
    }
    return true;
  }, {
    message: "Custom event type is required when 'Other' is selected.",
    path: ["customEventType"], 
  });

type InteractionFormValues = z.infer<typeof formSchema>;

interface InteractionLogFormProps {
  onLogInteraction: (interactionData: Omit<Interaction, 'id' | 'userId' | 'timestamp'>) => void;
}

export function InteractionLogForm({ onLogInteraction }: InteractionLogFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [managedPeople, setManagedPeople] = useState<ManagedPerson[]>([]);
  const [isLoadingPeople, setIsLoadingPeople] = useState(true);
  const [peopleDropdownOpen, setPeopleDropdownOpen] = useState(false);

  const form = useForm<InteractionFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      people: [],
      feelingBefore: 50,
      feelingAfter: 50,
      vibe: "",
      notes: "",
      customEventType: "",
    },
  });

  const watchedEventType = form.watch("eventType");

  useEffect(() => {
    if (user) {
      setIsLoadingPeople(true);
      const fetchPeople = async () => {
        try {
          const peopleCol = collection(db, 'users', user.uid, 'managedPeople');
          const q = query(peopleCol, orderBy('name', 'asc'));
          const querySnapshot = await getDocs(q);
          const fetchedPeople = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          } as ManagedPerson));
          setManagedPeople(fetchedPeople);
        } catch (error) {
          console.error("Error fetching managed people: ", error);
          toast({ title: "Error", description: "Could not load your people list.", variant: "destructive" });
        } finally {
          setIsLoadingPeople(false);
        }
      };
      fetchPeople();
    }
  }, [user, toast]);

  function onSubmit(data: InteractionFormValues) {
    const submissionData: Omit<Interaction, 'id' | 'userId' | 'timestamp'> = {
      ...data,
      // timestamp will be set by parent component using serverTimestamp or new Date()
    };
    if (data.eventType !== 'Other') {
      delete submissionData.customEventType;
    } else {
      submissionData.customEventType = data.customEventType;
    }

    onLogInteraction(submissionData);
    toast({
      title: "Interaction Logged!",
      description: `Your interaction for ${data.eventType === 'Other' ? data.customEventType : data.eventType} has been saved.`,
    });
    form.reset();
    form.setValue("people", []);
  }

  const getDynamicSliderStyles = (value: number) => {
    let textColorClass = 'text-muted-foreground';
    if (value < 35) {
      textColorClass = 'text-destructive';
    } else if (value > 65) {
      textColorClass = 'text-green-500';
    } else if (value >= 35 && value < 45) {
      textColorClass = 'text-orange-500';
    } else if (value >= 45 && value <= 55) {
      textColorClass = 'text-yellow-500'; // Central neutral-ish yellow
    } else if (value > 55 && value <= 65) {
      textColorClass = 'text-lime-500'; // Transitioning to green
    }
  
    const minOpacity = 0.3;
    const maxOpacity = 1.0;
  
    // Frown: prominent at low values
    let frownOpacity = maxOpacity - (value / 100) * (maxOpacity - minOpacity);
    // Smile: prominent at high values
    let smileOpacity = minOpacity + (value / 100) * (maxOpacity - minOpacity);
  
    // Ensure smooth transition by making the "middle" more gradual
     if (value > 40 && value < 60) {
        const midRange = 20; // 60 - 40
        const progressInMid = (value - 40) / midRange; // 0 to 1
        frownOpacity = maxOpacity - progressInMid * (maxOpacity-minOpacity);
        smileOpacity = minOpacity + progressInMid * (maxOpacity-minOpacity);
     } else if (value <=40) {
        frownOpacity = maxOpacity - (value/40 * (maxOpacity - (minOpacity+0.2))); // Becomes fully opaque quicker
        smileOpacity = minOpacity + (value/40 * 0.2) ; // Barely visible
     } else if (value >=60) {
        smileOpacity = minOpacity+0.2 + ((value-60)/40 * (maxOpacity - (minOpacity+0.2)));
        frownOpacity = minOpacity + ((100-value)/40 * 0.2);
     }


    frownOpacity = Math.max(0.2, Math.min(1.0, frownOpacity)); // Min opacity of 0.2 so it's never fully gone
    smileOpacity = Math.max(0.2, Math.min(1.0, smileOpacity));
  
    return {
      frownStyle: { opacity: frownOpacity },
      smileStyle: { opacity: smileOpacity },
      textColorClass,
    };
  };


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="people"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Who did you meet?</FormLabel>
              <Popover open={peopleDropdownOpen} onOpenChange={setPeopleDropdownOpen}>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      role="combobox"
                      className={cn(
                        "w-full justify-between h-auto min-h-10 py-2",
                        !field.value?.length && "text-muted-foreground"
                      )}
                    >
                      {isLoadingPeople ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : field.value?.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {field.value.map((person) => (
                            <Badge
                              variant="secondary"
                              key={person.id}
                              className="mr-1"
                            >
                              {person.name}
                            </Badge>
                          ))}
                        </div>
                      ) : "Select people..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search people..." />
                    <CommandList>
                      <CommandEmpty>No one found. <Link href="/people" className="text-primary underline">Add people?</Link></CommandEmpty>
                      <CommandGroup>
                        {managedPeople.map((person) => (
                          <CommandItem
                            value={person.name}
                            key={person.id}
                            onSelect={() => {
                              const currentSelection = field.value || [];
                              const isSelected = currentSelection.some(p => p.id === person.id);
                              if (isSelected) {
                                field.onChange(currentSelection.filter(p => p.id !== person.id));
                              } else {
                                field.onChange([...currentSelection, { id: person.id, name: person.name }]);
                              }
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                (field.value || []).some(p => p.id === person.id) ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {person.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <FormDescription>
                Select people you've added in the 'Manage People' section.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="eventType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>What kind of event was it?</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select event type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {eventTypes.map(et => (
                    <SelectItem key={et.value} value={et.value}>
                      <div className="flex items-center gap-2">
                        <et.icon className="h-4 w-4 text-muted-foreground" />
                        {et.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {watchedEventType === "Other" && (
          <FormField
            control={form.control}
            name="customEventType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Custom Event Type</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Hobby Club, Volunteering" {...field} />
                </FormControl>
                <FormDescription>Specify the event if 'Other'.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        
        <FormField
          control={form.control}
          name="feelingBefore"
          render={({ field }) => {
            const dynamicStyles = getDynamicSliderStyles(field.value);
            return (
              <FormItem>
                <FormLabel>How did you feel BEFORE the event? (Drained ↔ Fully Charged)</FormLabel>
                <div className="flex items-center gap-4">
                  <Frown 
                    className="text-destructive transition-opacity duration-300 ease-in-out" 
                    style={dynamicStyles.frownStyle}
                  />
                  <FormControl>
                    <Slider
                      defaultValue={[field.value]}
                      max={100}
                      step={1}
                      onValueChange={(value) => field.onChange(value[0])}
                      className="flex-1"
                    />
                  </FormControl>
                  <Smile 
                    className="text-green-500 transition-opacity duration-300 ease-in-out" 
                    style={dynamicStyles.smileStyle}
                  /> 
                </div>
                <FormDescription className={cn("text-center font-medium transition-colors duration-300 ease-in-out", dynamicStyles.textColorClass)}>
                  {field.value}% Charged
                </FormDescription>
                <FormMessage />
              </FormItem>
            );
          }}
        />

        <FormField
          control={form.control}
          name="feelingAfter"
          render={({ field }) => {
            const dynamicStyles = getDynamicSliderStyles(field.value);
            return (
              <FormItem>
                <FormLabel>How did you feel AFTER the event? (Drained ↔ Fully Charged)</FormLabel>
                <div className="flex items-center gap-4">
                  <Frown 
                    className="text-destructive transition-opacity duration-300 ease-in-out" 
                    style={dynamicStyles.frownStyle}
                  />
                  <FormControl>
                    <Slider
                      defaultValue={[field.value]}
                      max={100}
                      step={1}
                      onValueChange={(value) => field.onChange(value[0])}
                      className="flex-1"
                    />
                  </FormControl>
                  <Smile 
                    className="text-green-500 transition-opacity duration-300 ease-in-out" 
                    style={dynamicStyles.smileStyle}
                  />
                </div>
                <FormDescription className={cn("text-center font-medium transition-colors duration-300 ease-in-out", dynamicStyles.textColorClass)}>
                  {field.value}% Charged
                </FormDescription>
                <FormMessage />
              </FormItem>
            );
          }}
        />

        <FormField
          control={form.control}
          name="vibe"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Describe the vibe (1-3 words, optional)</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Relaxed, Tense, Fun" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Optional Notes</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="What stood out? Any specific feelings or observations?"
                  className="resize-none"
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting || isLoadingPeople}>
          {form.formState.isSubmitting ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Logging...</>
          ) : (
            "Log Interaction"
          )}
        </Button>
      </form>
    </Form>
  );
}
