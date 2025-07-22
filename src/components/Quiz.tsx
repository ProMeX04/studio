
"use client";

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Label } from './ui/label';

interface QuizQuestion {
  question: string;
  options: string[];
  answer: string;
  explanation: string;
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
  
  const handleAnswerSelect = (answer: string) => {
    if (isAnswered) return;
    setSelectedAnswer(answer);
    setIsAnswered(true);
  };

  const getOptionClass = (option: string) => {
    if (!isAnswered) return 'border-border cursor-pointer hover:bg-accent/50 bg-background/20 backdrop-blur';

    const isCorrect = option === currentQuestion?.answer;
    const isSelectedWrong = option === selectedAnswer && selectedAnswer !== currentQuestion?.answer;

    if (isCorrect) return 'bg-primary/30 border-primary backdrop-blur';
    if (isSelectedWrong) return 'bg-destructive/30 border-destructive backdrop-blur';
    return 'border-border bg-background/20 backdrop-blur';
  };

  if (!quizSet || !quizSet.questions || quizSet.questions.length === 0) {
    return (
      <div className="text-center h-64 flex items-center justify-center">
        Enter a topic in settings and click "Save" to create a quiz.
      </div>
    );
  }

  return (
    <Card className="h-full flex flex-col bg-transparent shadow-none border-none">
      <CardContent className="flex-grow flex flex-col justify-center items-center pt-8">
        {currentQuestion ? (
          <div className="w-full max-w-2xl mx-auto space-y-6">
             <h3 className="text-2xl font-semibold text-center bg-background/10 backdrop-blur rounded-lg p-6">{currentQuestion.question}</h3>
            <RadioGroup 
                value={selectedAnswer ?? ''} 
                onValueChange={handleAnswerSelect}
                disabled={isAnswered}
                className="space-y-3"
            >
              {currentQuestion.options.map((option, index) => (
                <Label
                  key={index}
                  className={cn(
                    "flex items-center gap-4 p-4 rounded-lg border transition-colors text-lg",
                    getOptionClass(option)
                  )}
                >
                  <RadioGroupItem value={option} id={`option-${index}`} />
                  {option}
                </Label>
              ))}
            </RadioGroup>
            {isAnswered && (
                 <div className={cn(
                    "p-4 rounded-lg backdrop-blur",
                    selectedAnswer === currentQuestion.answer 
                      ? "bg-primary/20"
                      : "bg-destructive/20"
                 )}>
                    <p className="font-bold text-base">{selectedAnswer === currentQuestion.answer ? "Correct!" : "Incorrect."}</p>
                    <p className="text-base">{currentQuestion.explanation}</p>
                 </div>
            )}
            <p className="text-center text-base pt-4">
              Question {currentQuestionIndex + 1} of {quizSet.questions.length}
            </p>
          </div>
        ) : (
           <div className="text-center h-64 flex items-center justify-center">
            No quiz available.
          </div>
        )}
      </CardContent>
      <CardFooter className="flex-col !pt-0 gap-2">
        {quizSet.questions.length > 0 && isAnswered && (
          <div className="w-full flex justify-center">
            <Button onClick={handleNextQuestion} className="w-full max-w-xs" variant="secondary">Next Question</Button>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
