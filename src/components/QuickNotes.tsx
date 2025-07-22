"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {StickyNote} from 'lucide-react';

export function QuickNotes() {
  const [notes, setNotes] = useState('');

  return (
    <Card className="h-full bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-headline">
          <StickyNote className="h-5 w-5"/>
          Quick Notes
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Jot down your thoughts..."
          className="h-48 resize-none bg-background/50"
        />
      </CardContent>
    </Card>
  );
}
