"use client";

import { useState, useEffect } from 'react';
import { Settings as SettingsIcon } from 'lucide-react';
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
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { ThemeToggle } from './ThemeToggle';
import { Separator } from './ui/separator';
import type { ComponentVisibility } from '@/app/page';
import { Switch } from './ui/switch';

interface SettingsProps {
  onSettingsSave: (topic: string, view: 'flashcards' | 'quiz', count: number, visibility: ComponentVisibility) => void;
}

export function Settings({ onSettingsSave }: SettingsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [topic, setTopic] = useState('');
  const [view, setView] = useState<'flashcards' | 'quiz'>('flashcards');
  const [count, setCount] = useState(5);
  const [visibility, setVisibility] = useState<ComponentVisibility>({
    clock: true,
    greeting: true,
    search: true,
    quickLinks: true,
    learn: true,
  });

  useEffect(() => {
    if (isOpen) {
      const savedTopic = localStorage.getItem('newTabTopic') || '';
      const savedView = (localStorage.getItem('newTabView') as 'flashcards' | 'quiz') || 'flashcards';
      const savedCount = parseInt(localStorage.getItem('newTabCount') || '5', 10);
      const savedVisibility = JSON.parse(localStorage.getItem('newTabVisibility') || '{}');

      setTopic(savedTopic);
      setView(savedView);
      setCount(savedCount);
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
    localStorage.setItem('newTabView', view);
    localStorage.setItem('newTabCount', count.toString());
    localStorage.setItem('newTabVisibility', JSON.stringify(visibility));
    onSettingsSave(topic, view, count, visibility);
    setIsOpen(false);
  };
  
  const handleCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const newCount = value === '' ? 0 : parseInt(value, 10);
    setCount(isNaN(newCount) ? 0 : newCount);
  }

  const handleVisibilityChange = (component: keyof ComponentVisibility, checked: boolean) => {
    setVisibility(prev => ({ ...prev, [component]: checked }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <SettingsIcon className="h-5 w-5" />
          <span className="sr-only">Settings</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        <div className="grid gap-6 py-4">
           <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">
              Theme
            </Label>
            <div className="col-span-3">
              <ThemeToggle />
            </div>
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
            <Label htmlFor="count" className="text-right">
              Number
            </Label>
            <Input
              id="count"
              type="number"
              value={count}
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
              onValueChange={(value) => setView(value as 'flashcards' | 'quiz')}
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
                    <Switch id="clock-visible" checked={visibility.clock} onCheckedChange={(c) => handleVisibilityChange('clock', c)} />
                    <Label htmlFor="clock-visible">Clock</Label>
                </div>
                <div className="flex items-center space-x-2">
                    <Switch id="greeting-visible" checked={visibility.greeting} onCheckedChange={(c) => handleVisibilityChange('greeting', c)} />
                    <Label htmlFor="greeting-visible">Greeting</Label>
                </div>
                <div className="flex items-center space-x-2">
                    <Switch id="search-visible" checked={visibility.search} onCheckedChange={(c) => handleVisibilityChange('search', c)} />
                    <Label htmlFor="search-visible">Search</Label>
                </div>
                <div className="flex items-center space-x-2">
                    <Switch id="quicklinks-visible" checked={visibility.quickLinks} onCheckedChange={(c) => handleVisibilityChange('quickLinks', c)} />
                    <Label htmlFor="quicklinks-visible">Quick Links</Label>
                </div>
                 <div className="flex items-center space-x-2">
                    <Switch id="learn-visible" checked={visibility.learn} onCheckedChange={(c) => handleVisibilityChange('learn', c)} />
                    <Label htmlFor="learn-visible">Learn Section</Label>
                </div>
            </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </DialogClose>
          <Button onClick={handleSave}>Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
