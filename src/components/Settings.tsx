"use client";

import { useState, useEffect, useRef } from 'react';
import { Settings as SettingsIcon, CheckCircle } from 'lucide-react';
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

interface SettingsProps {
  onSettingsSave: (topic: string, count: number, language: string, bg: string | null) => void;
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
  const [selectedBackground, setSelectedBackground] = useState<string | null>('');
  const [uploadedBackground, setUploadedBackground] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      const savedTopic = localStorage.getItem('newTabTopic') || '';
      const savedView = (localStorage.getItem('newTabView') as 'flashcards' | 'quiz') || 'flashcards';
      const savedCount = parseInt(localStorage.getItem('newTabCount') || '5', 10);
      const savedLanguage = localStorage.getItem('newTabLanguage') || 'English';
      const savedVisibility = JSON.parse(localStorage.getItem('newTabVisibility') || '{}');
      const savedBg = localStorage.getItem('newTabBackground');
      
      const savedUploadedBg = localStorage.getItem('newTabUploadedBackground');
      
      setUploadedBackground(savedUploadedBg);
      setSelectedBackground(savedBg);
      setTopic(savedTopic);
      setView(savedView);
      setCount(savedCount);
      setLanguage(savedLanguage)
      setVisibility({
        clock: savedVisibility.clock ?? true,
        greeting: savedVisibility.greeting ?? true,
        search: savedVisibility.search ?? true,
        quickLinks: savedVisibility.quickLinks ?? true,
        learn: savedVisibility.learn ?? true,
      });
    }
  }, [isOpen]);

  const handleSave = () => {
    localStorage.setItem('newTabTopic', topic);
    localStorage.setItem('newTabCount', count.toString());
    localStorage.setItem('newTabLanguage', language);
    
    if (uploadedBackground) {
        localStorage.setItem('newTabUploadedBackground', uploadedBackground);
    } else {
        localStorage.removeItem('newTabUploadedBackground');
    }

    onSettingsSave(topic, count, language, selectedBackground);
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
        setUploadedBackground(result);
        setSelectedBackground(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveBackground = () => {
    setSelectedBackground(null);
    setUploadedBackground(null);
    localStorage.removeItem('newTabUploadedBackground');
    onSettingsSave(topic, count, language, null);
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
            <div className="grid grid-cols-3 gap-2">
                {stockBackgrounds.map(bg => (
                    <div key={bg.id} className="relative cursor-pointer group" onClick={() => setSelectedBackground(bg.url)}>
                        <Image src={bg.url} alt={`Background ${bg.id}`} width={100} height={60} className={cn("rounded-md object-cover aspect-video", selectedBackground === bg.url && 'ring-2 ring-primary ring-offset-2 ring-offset-background')} data-ai-hint={bg.hint} />
                        {selectedBackground === bg.url && <CheckCircle className="absolute top-1 right-1 h-5 w-5 text-primary bg-background rounded-full" />}
                    </div>
                ))}
                 <div className="relative cursor-pointer group" onClick={() => fileInputRef.current?.click()}>
                    {uploadedBackground ? (
                         <Image src={uploadedBackground} alt="Uploaded background" width={100} height={60} className={cn("rounded-md object-cover aspect-video", selectedBackground === uploadedBackground && 'ring-2 ring-primary ring-offset-2 ring-offset-background')} />
                    ) : (
                        <div className="flex items-center justify-center w-full h-full aspect-video bg-muted rounded-md text-muted-foreground text-sm hover:bg-accent">
                            Upload
                        </div>
                    )}
                    {selectedBackground === uploadedBackground && <CheckCircle className="absolute top-1 right-1 h-5 w-5 text-primary bg-background rounded-full" />}
                 </div>
                 <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleBackgroundUpload}
                  className="hidden"
                  accept="image/*"
                />
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
