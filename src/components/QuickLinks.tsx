"use client";

import { useState, useEffect } from 'react';
import { Plus, MoreHorizontal, Pencil, Trash2, Link as LinkIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from './ui/form';

interface QuickLink {
  id: number;
  name: string;
  url: string;
}

const linkSchema = z.object({
  name: z.string().min(1, "Name is required"),
  url: z.string().url("Please enter a valid URL"),
});

const defaultLinks: QuickLink[] = [
    { id: 1, name: 'Google', url: 'https://google.com' },
    { id: 2, name: 'GitHub', url: 'https://github.com' },
    { id: 3, name: 'Firebase', url: 'https://firebase.google.com' },
    { id: 4, name: 'Vercel', url: 'https://vercel.com' },
];

export function QuickLinks() {
  const [links, setLinks] = useState<QuickLink[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<QuickLink | null>(null);

  const form = useForm<z.infer<typeof linkSchema>>({
    resolver: zodResolver(linkSchema),
    defaultValues: { name: '', url: '' },
  });

  useEffect(() => {
    try {
        const storedLinks = localStorage.getItem('quickLinks');
        if (storedLinks) {
          setLinks(JSON.parse(storedLinks));
        } else {
          setLinks(defaultLinks);
        }
    } catch (error) {
        console.error("Could not parse quick links from localStorage", error);
        setLinks(defaultLinks);
    }
  }, []);

  useEffect(() => {
    if (links.length > 0) {
        localStorage.setItem('quickLinks', JSON.stringify(links));
    }
  }, [links]);

  const handleEdit = (link: QuickLink) => {
    setEditingLink(link);
    form.reset({ name: link.name, url: link.url });
    setIsDialogOpen(true);
  };
  
  const handleDelete = (id: number) => {
    setLinks(links.filter((link) => link.id !== id));
  };

  const openAddDialog = () => {
    setEditingLink(null);
    form.reset({ name: '', url: '' });
    setIsDialogOpen(true);
  }

  const onSubmit = (values: z.infer<typeof linkSchema>) => {
    if (editingLink) {
        setLinks(links.map((l) => (l.id === editingLink.id ? { ...l, ...values } : l)));
    } else {
        setLinks([...links, { ...values, id: Date.now() }]);
    }
    setIsDialogOpen(false);
  };

  return (
    <div className="flex justify-center items-center gap-2 md:gap-4 bg-card/50 backdrop-blur-sm p-3 rounded-lg">
      {links.map((link) => (
        <div key={link.id} className="group relative">
            <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-2 p-2 rounded-lg transition-colors hover:bg-primary/20 w-20"
            >
            <div className="bg-primary/10 p-3 rounded-full">
                <img src={`https://www.google.com/s2/favicons?domain=${link.url}&sz=32`} alt={`${link.name} favicon`} className="h-8 w-8"/>
            </div>
            <span className="text-sm font-medium truncate w-full text-center">{link.name}</span>
            </a>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="absolute top-0 right-0 h-6 w-6 opacity-0 group-hover:opacity-100">
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuItem onSelect={() => handleEdit(link)}>
                        <Pencil className="mr-2 h-4 w-4" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => handleDelete(link.id)} className="text-destructive">
                         <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
      ))}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" className="flex flex-col items-center gap-2 p-2 rounded-lg h-full w-20" onClick={openAddDialog}>
            <div className="bg-primary/10 p-3 rounded-full">
                <Plus className="h-8 w-8 text-primary" />
            </div>
            <span className="text-sm font-medium">Add New</span>
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingLink ? 'Edit Link' : 'Add a new link'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                            <Input placeholder="e.g. Google" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="url"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>URL</FormLabel>
                        <FormControl>
                            <Input placeholder="https://google.com" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="secondary">
                            Cancel
                        </Button>
                    </DialogClose>
                    <Button type="submit">Save</Button>
                </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
