"use client";

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from './ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Label } from './ui/label';

interface QuizQuestion {
  question: string;
  options: string[];
  answer: string;
}

interface QuizSet {
  id: string;
  topic: string;
  questions: QuizQuestion[];
}

export function Quiz() {
  const [quizSets, setQuizSets] = useState<QuizSet[]>([]);
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchQuizzes = async () => {
      setIsLoading(true);
      try {
        const q = query(collection(db, 'quizzes'), orderBy('createdAt', 'desc'), limit(5));
        const querySnapshot = await getDocs(q);
        const sets = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QuizSet));
        setQuizSets(sets);
        if (sets.length === 0) {
           toast({ title: 'No quizzes found', description: 'Generate a new set to get started.' });
        }
      } catch (error) {
        console.error(error);
        toast({ title: 'Error', description: 'Failed to fetch quizzes.', variant: 'destructive' });
      } finally {
        setIsLoading(false);
      }
    };
    fetchQuizzes();
  }, [toast]);

  const currentSet = useMemo(() => quizSets[currentSetIndex], [quizSets, currentSetIndex]);
  const currentQuestion = useMemo(() => currentSet?.questions[currentQuestionIndex], [currentSet, currentQuestionIndex]);

  const resetQuestionState = () => {
    setSelectedAnswer(null);
    setIsAnswered(false);
  };

  const handleNextQuestion = () => {
    resetQuestionState();
    setCurrentQuestionIndex((prev) => (prev + 1) % (currentSet?.questions.length || 1));
  };
  
  const handleNextSet = () => {
      resetQuestionState();
      setCurrentQuestionIndex(0);
      setCurrentSetIndex((prev) => (prev + 1) % (quizSets.length || 1));
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

  return (
    <Card className="h-full flex flex-col bg-transparent shadow-none border-none">
      <CardHeader>
        <CardTitle className="flex items-center justify-end gap-2 font-headline">
          {currentSet && <span className="text-sm font-normal text-muted-foreground">{currentSet.topic}</span>}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col justify-center items-center">
        {isLoading ? (
          <div className="w-full h-64 flex flex-col justify-center items-center gap-4 p-4">
            <Skeleton className="h-8 w-3/4" />
            <div className="space-y-2 w-full">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        ) : currentQuestion ? (
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
              Question {currentQuestionIndex + 1} of {currentSet.questions.length}
            </p>
          </div>
        ) : (
          <div className="text-center text-muted-foreground h-64 flex items-center justify-center">
            No quiz available. Enter a topic above and click "Generate" to create one.
          </div>
        )}
      </CardContent>
      <CardFooter className="flex-col !pt-0 gap-2">
        {quizSets.length > 0 && (
          <div className="w-full flex gap-2">
            <Button onClick={handleSubmitAnswer} className="w-full" disabled={isAnswered}>Submit</Button>
            <Button onClick={handleNextQuestion} className="w-full" variant="secondary" disabled={!isAnswered}>Next Question</Button>
            <Button onClick={handleNextSet} variant="outline" className="w-full">Next Set</Button>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
