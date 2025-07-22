"use client";

import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { answerQuestion } from '@/ai/flows/answer-question';
import { Skeleton } from './ui/skeleton';

export function GeminiInteraction() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAsk = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!question.trim()) return;

    setIsLoading(true);
    setAnswer('');
    try {
      const result = await answerQuestion({ question });
      setAnswer(result.answer);
    } catch (error) {
      console.error(error);
      setAnswer('Sorry, I encountered an error.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <form onSubmit={handleAsk} className="flex gap-2">
        <Input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask Gemini anything..."
          className="flex-grow bg-card/80 backdrop-blur-sm"
          disabled={isLoading}
        />
        <Button type="submit" disabled={isLoading}>
          <Sparkles className="mr-2 h-4 w-4" />
          Ask
        </Button>
      </form>
      {isLoading && (
         <Card className="bg-card/80 backdrop-blur-sm">
            <CardContent className="p-4 space-y-2">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
            </CardContent>
         </Card>
      )}
      {answer && (
        <Card className="bg-card/80 backdrop-blur-sm text-left">
          <CardContent className="p-4">
            <p className="font-medium text-foreground">{question}</p>
            <p className="text-muted-foreground">{answer}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
