"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import type { Database } from "@/lib/schema";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, type BaseSyntheticEvent } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

type Species = Database["public"]["Tables"]["species"]["Row"];

export default function SpeciesCard(species: Species, userId: string) {
  const [open, setOpen] = useState<boolean>(false);
  const [edit, setEdit] = useState<boolean>(false);

  const handleEdit = async () => {
    console.log(species);
    setEdit(true);
    const supabase = createClientComponentClient<Database>();
    // const { data, error } = await supabase.from("species").update();
  };

  const form = useForm<FormData>({
    mode: "onChange",
  });

  const router = useRouter();

  const kingdoms = z.enum(["Animalia", "Plantae", "Fungi", "Protista", "Archaea", "Bacteria"]);

  const speciesSchema = z.object({
    common_name: z
      .string()
      .nullable()
      // Transform empty string or only whitespace input to null before form submission
      .transform((val) => (val?.trim() === "" ? null : val?.trim())),
    description: z
      .string()
      .nullable()
      .transform((val) => (val?.trim() === "" ? null : val?.trim())),
    kingdom: kingdoms,
    scientific_name: z
      .string()
      .trim()
      .min(1)
      .transform((val) => val?.trim()),
    total_population: z.number().int().positive().min(1).optional(),
    image: z
      .string()
      .url()
      .nullable()
      .transform((val) => val?.trim()),
  });

  type FormData = z.infer<typeof speciesSchema>;

  const defaultValues: Partial<FormData> = {
    kingdom: "Animalia",
  };

  const onSubmit = async (input: FormData) => {
    // The `input` prop contains data that has already been processed by zod. We can now use it in a supabase query
    const supabase = createClientComponentClient<Database>();
    const { error } = await supabase
      .from("species")
      .update([
        {
          author: userId,
          common_name: input.common_name,
          description: input.description,
          kingdom: input.kingdom,
          scientific_name: input.scientific_name,
          total_population: input.total_population,
          image: input.image,
        },
      ])
      .eq("userId", userId);

    if (error) {
      return toast({
        title: "Something went wrong.",
        description: error.message,
        variant: "destructive",
      });
    }

    form.reset(input);

    setOpen(false);
    router.refresh();
  };

  return (
    <div className="min-w-72 m-4 w-72 flex-none rounded border-2 p-3 shadow">
      {species.image && (
        <div className="relative h-40 w-full">
          <Image src={species.image} alt={species.scientific_name} fill style={{ objectFit: "cover" }} />
        </div>
      )}
      <h3 className="mt-3 text-2xl font-semibold">{species.common_name}</h3>
      <h4 className="text-lg font-light italic">{species.scientific_name}</h4>
      <p>{species.description ? species.description.slice(0, 150).trim() + "..." : ""}</p>
      {/* Replace with detailed view */}
      <Button className="mt-3 w-full" onClick={() => setOpen(true)}>
        Learn More
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-screen overflow-y-auto sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Species</DialogTitle>
            {/* make it look nicer */}
            <DialogDescription>Scientific name: {species.scientific_name}</DialogDescription>
            <DialogDescription>Common name: {species.common_name}</DialogDescription>
            <DialogDescription>Total Population: {species.total_population}</DialogDescription>
            <DialogDescription>Kingdom: {species.kingdom}</DialogDescription>
            <DialogDescription>Description: {species.description}</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
      <Button variant="secondary" onClick={() => setEdit(true)}>
        Edit
      </Button>
      <Dialog open={edit} onOpenChange={setEdit}>
        <DialogContent className="max-h-screen overflow-y-auto sm:max-w-[600px]">
          <Form {...form}>
            <form onSubmit={(e: BaseSyntheticEvent) => void form.handleSubmit(onSubmit)(e)}>
              <div className="grid w-full items-center gap-4">
                <FormField
                  control={form.control}
                  name="scientific_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Scientific Name</FormLabel>
                      <FormControl>
                        <Input placeholder={species.scientific_name} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="common_name"
                  render={({ field }) => {
                    // We must extract value from field and convert a potential defaultValue of `null` to "" because inputs can't handle null values: https://github.com/orgs/react-hook-form/discussions/4091
                    const { value, ...rest } = field;
                    return (
                      <FormItem>
                        <FormLabel>Common Name</FormLabel>
                        <FormControl>
                          <Input value={value ?? ""} placeholder={species.common_name} {...rest} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
                <FormField
                  control={form.control}
                  name="kingdom"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kingdom</FormLabel>
                      {/* Using shadcn/ui form with enum: https://github.com/shadcn-ui/ui/issues/772 */}
                      <Select
                        onValueChange={(value) => field.onChange(kingdoms.parse(value))}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={species.kingdom} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectGroup>
                            {kingdoms.options.map((kingdom, index) => (
                              <SelectItem key={index} value={kingdom}>
                                {kingdom}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="total_population"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total population</FormLabel>
                      <FormControl>
                        {/* Using shadcn/ui form with number: https://github.com/shadcn-ui/ui/issues/421 */}
                        <Input
                          type="number"
                          placeholder={species.total_population}
                          {...field}
                          onChange={(event) => field.onChange(+event.target.value)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="image"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Image URL</FormLabel>
                      <FormControl>
                        <Input placeholder={species.image} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => {
                    // We must extract value from field and convert a potential defaultValue of `null` to "" because textareas can't handle null values: https://github.com/orgs/react-hook-form/discussions/4091
                    const { value, ...rest } = field;
                    return (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea value={value ?? ""} placeholder={species.description} {...rest} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
                <div className="flex">
                  <Button type="submit" className="ml-1 mr-1 flex-auto">
                    Edit Species
                  </Button>
                  <Button
                    type="button"
                    className="ml-1 mr-1 flex-auto"
                    variant="secondary"
                    onClick={() => setEdit(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
