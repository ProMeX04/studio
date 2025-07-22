"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from './ui/skeleton';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Label } from './ui/label';
import { cn } from '@/lib/utils';
import { Progress } from './ui/progress';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';

interface QuizQuestion {
  question: string;
  options: string[];
  answer: string;
}

interface QuizData {
  id: string;
  topic: string;
  questions: QuizQuestion[];
}

export function Quiz() {
  const [quizzes, setQuizzes] = useState<QuizData[]>([]);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isFinished, setIsFinished] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchQuizzes = async () => {
      setIsLoading(true);
      try {
        const q = query(collection(db, 'quizzes'), orderBy('createdAt', 'desc'), limit(5));
        const querySnapshot = await getDocs(q);
        const quizData = querySnapshot.docs.map(doc => {
            const data = doc.data();
            // The quiz is stored as a JSON string in the 'quiz' field
            const parsedQuiz = JSON.parse(data.quiz);
            return {
                id: doc.id,
                topic: data.topic,
                questions: parsedQuiz.questions,
            } as QuizData;
        });
        setQuizzes(quizData);
        if (quizData.length === 0) {
          toast({ title: 'No quizzes found', description: 'There are no quizzes in the database.' });
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
  
  const currentQuiz = quizzes[currentQuizIndex];
  
  const resetQuizState = () => {
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setIsCorrect(null);
    setScore(0);
    setIsFinished(false);
  }

  const handleNextQuiz = () => {
    resetQuizState();
    setCurrentQuizIndex((prev) => (prev + 1) % (quizzes.length || 1));
  };
  
  const handleRestart = () => {
    resetQuizState();
  };

  const handleSubmitAnswer = () => {
    if (!selectedAnswer || !currentQuiz) return;
    const correct = selectedAnswer === currentQuiz.questions[currentQuestionIndex].answer;
    setIsCorrect(correct);
    if (correct) {
      setScore(s => s + 1);
    }
  };

  const handleNextQuestion = () => {
    setIsCorrect(null);
    setSelectedAnswer(null);
    if (currentQuestionIndex === currentQuiz!.questions.length - 1) {
      setIsFinished(true);
    } else {
      setCurrentQuestionIndex(i => i + 1);
    }
  };

  const currentQuestion = currentQuiz?.questions[currentQuestionIndex];
  const progress = currentQuiz ? ((currentQuestionIndex) / currentQuiz.questions.length) * 100 : 0;

  return (
    <Card className="h-full flex flex-col bg-transparent shadow-none border-none">
      <CardHeader>
        <CardTitle className="flex items-center justify-end gap-2 font-headline">
            {currentQuiz && <span className="text-sm font-normal text-muted-foreground">{currentQuiz.topic}</span>}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col justify-center">
        {isLoading && (
          <div className="space-y-4 p-4">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
        )}
        {!isLoading && currentQuiz && !isFinished && currentQuestion && (
            <div className="space-y-4">
                <Progress value={progress} className="h-2" />
                <p className="font-semibold text-lg">{currentQuestion.question}</p>
                <RadioGroup onValueChange={setSelectedAnswer} value={selectedAnswer || ''} disabled={isCorrect !== null}>
                    {currentQuestion.options.map((opt) => (
                        <div key={opt} className={cn(
                            "flex items-center space-x-2 p-2 rounded-md border border-transparent",
                            isCorrect !== null && opt === currentQuestion.answer && "bg-green-500/20 border-green-500",
                            isCorrect === false && selectedAnswer === opt && "bg-red-500/20 border-red-500"
                            )}>
                            <RadioGroupItem value={opt} id={opt} />
                            <Label htmlFor={opt} className="flex-grow cursor-pointer">{opt}</Label>
                        </div>
                    ))}
                </RadioGroup>
            </div>
        )}
        {!isLoading && isFinished && (
            <div className="text-center space-y-4">
                <h3 className="text-2xl font-bold">Quiz Complete!</h3>
                <p className="text-lg">Your score: {score} / {currentQuiz?.questions.length}</p>
                <Button onClick={handleRestart}>Play Again</Button>
            </div>
        )}
        {!isLoading && !currentQuiz && !isFinished && (
            <div className="text-center text-muted-foreground h-48 flex items-center justify-center">
                 No quizzes available.
            </div>
        )}

      </CardContent>
      <CardFooter className="flex-col !pt-0 gap-2">
        {currentQuiz && !isFinished ? (
            isCorrect !== null ? (
                <Button onClick={handleNextQuestion} className="w-full">
                    {currentQuestionIndex === currentQuiz.questions.length - 1 ? "Finish Quiz" : "Next Question"}
                </Button>
            ) : (
                <Button onClick={handleSubmitAnswer} disabled={!selectedAnswer} className="w-full">Submit</Button>
            )
        ) : quizzes.length > 0 ? (
            <Button onClick={handleNextQuiz} className="w-full">Next Quiz</Button>
        ) : null }
      </CardFooter>
    </Card>
  );
}
