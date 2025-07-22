
"use client";

import { useState, useEffect, useRef } from 'react';
import { Settings as SettingsIcon, CheckCircle, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Separator } from './ui/separator';
import type { ComponentVisibility } from '@/app/page';
import { Switch } from './ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { ThemeToggle } from './ThemeToggle';
import { getDb } from '@/lib/idb';

interface SettingsProps {
  onSettingsSave: (settings: {
    topic: string;
    count: number;
    language: string;
    background: string | null | undefined; // undefined means no change
    uploadedBackgrounds: string[];
  }) => void;
  onVisibilityChange: (visibility: ComponentVisibility) => void;
  onViewChange: (view: 'flashcards' | 'quiz') => void;
}

const languages = [
    { value: 'English', label: 'English' },
    { value: 'Spanish', label: 'Español' },
    { value: 'French', label: 'Français' },
    { value: 'German', label: 'Deutsch' },
    { value: 'Japanese', label: '日本語' },
    { value: 'Korean', label: '한국어' },
    { value: 'Vietnamese', label: 'Tiếng Việt' },
];

const stockBackgrounds = [
    { id: '1', url: 'https://placehold.co/1920x1080.png', hint: 'nature landscape'},
    { id: '2', url: 'https://placehold.co/1920x1080.png', hint: 'abstract art'},
    { id: '3', url: 'https://placehold.co/1920x1080.png', hint: 'city skyline'},
    { id: '4', url: 'https://placehold.co/1920x1080.png', hint: 'minimalist texture'},
    { id: '5', url: 'https://placehold.co/1920x1080.png', hint: 'space galaxy'},
    { id: '6', url: 'https://placehold.co/1920x1080.png', hint: 'ocean waves'},
];

const MAX_UPLOADED_IMAGES = 5;

export function Settings({ onSettingsSave, onVisibilityChange, onViewChange }: SettingsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [topic, setTopic] = useState('');
  const [view, setView] = useState<'flashcards' | 'quiz'>('flashcards');
  const [count, setCount] = useState(5);
  const [language, setLanguage] = useState('English');
  const [visibility, setVisibility] = useState<ComponentVisibility>({
    clock: true,
    greeting: true,
    search: true,
    quickLinks: true,
    learn: true,
  });
  const [selectedBackground, setSelectedBackground] = useState<string | null>(null);
  const [uploadedBackgrounds, setUploadedBackgrounds] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadSettings() {
      if (isOpen) {
        const db = await getDb();
        const savedTopic = (await db.get('data', 'topic'))?.data as string || '';
        const savedView = (await db.get('data', 'view'))?.data as 'flashcards' | 'quiz' || 'flashcards';
        const savedCount = (await db.get('data', 'count'))?.data as number || 5;
        const savedLanguage = (await db.get('data', 'language'))?.data as string || 'English';
        const savedVisibility = (await db.get('data', 'visibility'))?.data as ComponentVisibility;
        const savedBg = (await db.get('data', 'background'))?.data as string | null;
        const savedUploadedBgs = (await db.get('data', 'uploadedBackgrounds'))?.data as string[] || [];
        
        setTopic(savedTopic);
        setView(savedView);
        setCount(savedCount);
        setLanguage(savedLanguage);
        setVisibility(savedVisibility ?? {
          clock: true,
          greeting: true,
          search: true,
          quickLinks: true,
          learn: true,
        });
        setSelectedBackground(savedBg);
        setUploadedBackgrounds(savedUploadedBgs);
      }
    }
    loadSettings();
  }, [isOpen]);

  const handleSave = () => {
    onSettingsSave({
        topic,
        count,
        language,
        background: selectedBackground,
        uploadedBackgrounds,
    });
    setIsOpen(false);
  };
  
  const handleCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const newCount = value === '' ? 0 : parseInt(value, 10);
    setCount(isNaN(newCount) ? 0 : newCount);
  }

  const handleVisibilitySwitch = (component: keyof ComponentVisibility, checked: boolean) => {
    const newVisibility = { ...visibility, [component]: checked };
    setVisibility(newVisibility);
    onVisibilityChange(newVisibility);
  };

  const handleViewChange = (newView: 'flashcards' | 'quiz') => {
    setView(newView);
    onViewChange(newView);
  }

  const handleBackgroundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        const newUploadedBgs = [result, ...uploadedBackgrounds].slice(0, MAX_UPLOADED_IMAGES);
        setUploadedBackgrounds(newUploadedBgs);
        setSelectedBackground(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveBackground = () => {
    setSelectedBackground(null);
    onSettingsSave({
      topic,
      count,
      language,
      background: null, // Explicitly set to null to remove
      uploadedBackgrounds,
    });
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon">
          <SettingsIcon className="h-5 w-5" />
          <span className="sr-only">Settings</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="max-h-[100vh] w-[400px] sm:max-w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Settings</SheetTitle>
        </SheetHeader>
        <div className="grid gap-6 py-4">
            <Separator />
            <p className="font-medium text-foreground">Theme</p>
             <div className="pl-10">
                <ThemeToggle />
            </div>
          <Separator />
          <p className="font-medium text-foreground">Background</p>
            <div className="flex flex-col gap-4">
                <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload an Image
                </Button>
                 <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleBackgroundUpload}
                  className="hidden"
                  accept="image/*"
                />
                <div className="grid grid-cols-3 gap-2">
                    {uploadedBackgrounds.map((bg, index) => (
                        <div key={`uploaded-${index}`} className="relative cursor-pointer group" onClick={() => setSelectedBackground(bg)}>
                             <Image src={bg} alt={`Uploaded background ${index + 1}`} width={100} height={60} className={cn("rounded-md object-cover aspect-video", selectedBackground === bg && 'ring-2 ring-primary ring-offset-2 ring-offset-background')} />
                            {selectedBackground === bg && <CheckCircle className="absolute top-1 right-1 h-5 w-5 text-primary bg-background rounded-full" />}
                        </div>
                    ))}
                    {stockBackgrounds.map(bg => (
                        <div key={bg.id} className="relative cursor-pointer group" onClick={() => setSelectedBackground(bg.url)}>
                            <Image src={bg.url} alt={`Background ${bg.id}`} width={100} height={60} className={cn("rounded-md object-cover aspect-video", selectedBackground === bg.url && 'ring-2 ring-primary ring-offset-2 ring-offset-background')} data-ai-hint={bg.hint} />
                            {selectedBackground === bg.url && <CheckCircle className="absolute top-1 right-1 h-5 w-5 text-primary bg-background rounded-full" />}
                        </div>
                    ))}
                </div>
            </div>
             <div className="flex justify-end">
                <Button variant="ghost" size="sm" onClick={handleRemoveBackground}>
                  Remove Background
                </Button>
            </div>
          <Separator />
          <p className="font-medium text-foreground">Learn Settings</p>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="topic" className="text-right">
              Topic
            </Label>
            <Input
              id="topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="col-span-3"
              placeholder="e.g. Roman History"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="language" className="text-right">
              Language
            </Label>
            <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select a language" />
                </SelectTrigger>
                <SelectContent>
                    {languages.map((lang) => (
                        <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="count" className="text-right">
              Number
            </Label>
            <Input
              id="count"
              type="number"
              value={count === 0 ? '' : count}
              onChange={handleCountChange}
              className="col-span-3"
              placeholder="e.g. 5"
              min="1"
              max="10"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Default View</Label>
            <RadioGroup 
              value={view}
              onValueChange={(value) => handleViewChange(value as 'flashcards' | 'quiz')}
              className="col-span-3 flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="flashcards" id="flashcards" />
                <Label htmlFor="flashcards">Flashcards</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="quiz" id="quiz" />
                <Label htmlFor="quiz">Quiz</Label>
              </div>
            </RadioGroup>
          </div>
           <Separator />
            <p className="font-medium text-foreground">Visible Components</p>
             <div className="grid grid-cols-2 gap-x-4 gap-y-4 pl-10">
                <div className="flex items-center space-x-2">
                    <Switch id="clock-visible" checked={visibility.clock} onCheckedChange={(c) => handleVisibilitySwitch('clock', c)} />
                    <Label htmlFor="clock-visible">Clock</Label>
                </div>
                <div className="flex items-center space-x-2">
                    <Switch id="greeting-visible" checked={visibility.greeting} onCheckedChange={(c) => handleVisibilitySwitch('greeting', c)} />
                    <Label htmlFor="greeting-visible">Greeting</Label>
                </div>
                <div className="flex items-center space-x-2">
                    <Switch id="search-visible" checked={visibility.search} onCheckedChange={(c) => handleVisibilitySwitch('search', c)} />
                    <Label htmlFor="search-visible">Search</Label>
                </div>
                <div className="flex items-center space-x-2">
                    <Switch id="quicklinks-visible" checked={visibility.quickLinks} onCheckedChange={(c) => handleVisibilitySwitch('quickLinks', c)} />
                    <Label htmlFor="quicklinks-visible">Quick Links</Label>
                </div>
                 <div className="flex items-center space-x-2">
                    <Switch id="learn-visible" checked={visibility.learn} onCheckedChange={(c) => handleVisibilitySwitch('learn', c)} />
                    <Label htmlFor="learn-visible">Learn Section</Label>
                </div>
            </div>
        </div>
        <SheetFooter>
          <SheetClose asChild>
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </SheetClose>
          <Button onClick={handleSave}>Save changes</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

    