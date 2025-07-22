"use client";

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Label } from './ui/label';

interface QuizQuestion {
  question: string;
  options: string[];
  answer: string;
}

export interface QuizSet {
  id: string;
  topic: string;
  questions: QuizQuestion[];
}

interface QuizProps {
    quizSet: QuizSet | null;
}

export function Quiz({ quizSet }: QuizProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Reset when the set changes
    resetQuestionState();
    setCurrentQuestionIndex(0);
  }, [quizSet]);


  const currentQuestion = useMemo(() => quizSet?.questions[currentQuestionIndex], [quizSet, currentQuestionIndex]);

  const resetQuestionState = () => {
    setSelectedAnswer(null);
    setIsAnswered(false);
  };

  const handleNextQuestion = () => {
    resetQuestionState();
    setCurrentQuestionIndex((prev) => (prev + 1) % (quizSet?.questions.length || 1));
  };

  const handleSubmitAnswer = () => {
    if (!selectedAnswer) {
        toast({ title: 'Oops!', description: 'Please select an answer.', variant: 'destructive' });
        return;
    }
    setIsAnswered(true);
  };
  
  const getOptionClass = (option: string) => {
    if (!isAnswered) return '';
    if (option === currentQuestion?.answer) return 'bg-green-500/20 border-green-500';
    if (option === selectedAnswer) return 'bg-red-500/20 border-red-500';
    return '';
  };

  if (!quizSet || !quizSet.questions || quizSet.questions.length === 0) {
    return (
      <div className="text-center text-muted-foreground h-64 flex items-center justify-center">
        Enter a topic in settings and click "Save" to create a quiz.
      </div>
    );
  }

  return (
    <Card className="h-full flex flex-col bg-transparent shadow-none border-none">
      <CardContent className="flex-grow flex flex-col justify-center items-center pt-8">
        {currentQuestion ? (
          <div className="w-full space-y-4">
             <h3 className="text-lg font-semibold text-center">{currentQuestion.question}</h3>
            <RadioGroup 
                value={selectedAnswer ?? ''} 
                onValueChange={setSelectedAnswer}
                disabled={isAnswered}
                className="space-y-2"
            >
              {currentQuestion.options.map((option, index) => (
                <Label
                  key={index}
                  className={cn(
                    "flex items-center gap-4 p-3 rounded-lg border cursor-pointer transition-colors",
                    isAnswered ? getOptionClass(option) : 'hover:bg-accent/50'
                  )}
                >
                  <RadioGroupItem value={option} id={`option-${index}`} />
                  {option}
                </Label>
              ))}
            </RadioGroup>
            <p className="text-center text-sm text-muted-foreground">
              Question {currentQuestionIndex + 1} of {quizSet.questions.length}
            </p>
          </div>
        ) : (
           <div className="text-center text-muted-foreground h-64 flex items-center justify-center">
            No quiz available.
          </div>
        )}
      </CardContent>
      <CardFooter className="flex-col !pt-0 gap-2">
        {quizSet.questions.length > 0 && (
          <div className="w-full flex gap-2">
            <Button onClick={handleSubmitAnswer} className="w-full" disabled={isAnswered}>Submit</Button>
            <Button onClick={handleNextQuestion} className="w-full" variant="secondary" disabled={!isAnswered}>Next Question</Button>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
