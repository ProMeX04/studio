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

interface SettingsProps {
  onSettingsSave: (topic: string, view: 'flashcards' | 'quiz') => void;
}

export function Settings({ onSettingsSave }: SettingsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [topic, setTopic] = useState('');
  const [view, setView] = useState<'flashcards' | 'quiz'>('flashcards');

  useEffect(() => {
    if (isOpen) {
      const savedTopic = localStorage.getItem('newTabTopic') || '';
      const savedView = (localStorage.getItem('newTabView') as 'flashcards' | 'quiz') || 'flashcards';
      setTopic(savedTopic);
      setView(savedView);
    }
  }, [isOpen]);

  const handleSave = () => {
    localStorage.setItem('newTabTopic', topic);
    localStorage.setItem('newTabView', view);
    onSettingsSave(topic, view);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <SettingsIcon className="h-5 w-5" />
          <span className="sr-only">Settings</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
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
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="topic" className="text-right">
              Learn Topic
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
            <Label className="text-right">Learn View</Label>
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
