"use client";

import { useState, useEffect } from 'react';
import { FileQuestion, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { generateQuiz } from '@/ai/flows/generate-quiz';
import { Skeleton } from './ui/skeleton';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Label } from './ui/label';
import { cn } from '@/lib/utils';
import { Progress } from './ui/progress';
import { useToast } from '@/hooks/use-toast';

interface QuizQuestion {
  question: string;
  options: string[];
  answer: string;
}

interface QuizData {
  questions: QuizQuestion[];
}

export function Quiz() {
  const [topic, setTopic] = useState('');
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const { toast } = useToast();

  const handleGenerate = async (e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    if (!topic.trim()) return;
    
    setIsLoading(true);
    setQuiz(null);
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setIsCorrect(null);
    setScore(0);
    setIsFinished(false);

    try {
      const result = await generateQuiz({ topic });
      const parsedQuiz: QuizData = JSON.parse(result.quiz);
      setQuiz(parsedQuiz);
    } catch (error) {
      console.error(error);
      toast({ title: 'Error', description: 'Failed to generate quiz. The AI might have returned an invalid format. Please try again.', variant: 'destructive' });
      setQuiz(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitAnswer = () => {
    if (!selectedAnswer || !quiz) return;
    const correct = selectedAnswer === quiz.questions[currentQuestionIndex].answer;
    setIsCorrect(correct);
    if (correct) {
      setScore(s => s + 1);
    }
  };

  const handleNextQuestion = () => {
    setIsCorrect(null);
    setSelectedAnswer(null);
    if (currentQuestionIndex === quiz!.questions.length - 1) {
      setIsFinished(true);
    } else {
      setCurrentQuestionIndex(i => i + 1);
    }
  };
  
  const handleRestart = () => {
    handleGenerate();
  };

  const currentQuestion = quiz?.questions[currentQuestionIndex];
  const progress = quiz ? ((currentQuestionIndex) / quiz.questions.length) * 100 : 0;

  return (
    <Card className="h-full flex flex-col bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-headline">
          <FileQuestion className="h-5 w-5" />
          AI Quiz
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
        {!isLoading && quiz && !isFinished && currentQuestion && (
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
                <p className="text-lg">Your score: {score} / {quiz?.questions.length}</p>
                <Button onClick={handleRestart}>Play Again with Same Topic</Button>
            </div>
        )}
        {!isLoading && !quiz && !isFinished && (
            <div className="text-center text-muted-foreground h-48 flex items-center justify-center">
                 Enter a topic to generate a quiz.
            </div>
        )}

      </CardContent>
      <CardFooter className="flex-col !pt-0 gap-2">
        {quiz && !isFinished ? (
            isCorrect !== null ? (
                <Button onClick={handleNextQuestion} className="w-full">
                    {currentQuestionIndex === quiz.questions.length - 1 ? "Finish Quiz" : "Next Question"}
                </Button>
            ) : (
                <Button onClick={handleSubmitAnswer} disabled={!selectedAnswer} className="w-full">Submit</Button>
            )
        ) : (
          <form onSubmit={handleGenerate} className="flex w-full gap-2">
            <Input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Solar System"
              disabled={isLoading}
              className='bg-background/50'
            />
            <Button type="submit" disabled={isLoading}>
              {isLoading ? <RefreshCw className="h-4 w-4 animate-spin"/> : 'Go'}
            </Button>
          </form>
        )}
      </CardFooter>
    </Card>
  );
}
