
"use client";

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Label } from './ui/label';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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

export interface AnswerState {
  [questionIndex: number]: {
      selected: string | null;
      isAnswered: boolean;
  }
}

export interface QuizState {
  currentQuestionIndex: number;
  answers: AnswerState;
}

interface QuizProps {
  quizSet: QuizSet | null;
  initialState: QuizState | null;
  onStateChange: (newState: QuizState) => void;
}

export function Quiz({ quizSet, initialState, onStateChange }: QuizProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(initialState?.currentQuestionIndex || 0);
  const [answers, setAnswers] = useState<AnswerState>(initialState?.answers || {});

  const currentAnswerState = answers[currentQuestionIndex] || { selected: null, isAnswered: false };
  const { selected: selectedAnswer, isAnswered } = currentAnswerState;

  useEffect(() => {
    if (initialState) {
        setCurrentQuestionIndex(initialState.currentQuestionIndex);
        setAnswers(initialState.answers);
    } else {
        // Reset if quizSet changes and there's no initial state for it
        setCurrentQuestionIndex(0);
        setAnswers({});
    }
  }, [quizSet, initialState]);

  useEffect(() => {
    onStateChange({ currentQuestionIndex, answers });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestionIndex, answers]);


  const currentQuestion = useMemo(() => quizSet?.questions[currentQuestionIndex], [quizSet, currentQuestionIndex]);

  const handleNextQuestion = () => {
    if (quizSet && currentQuestionIndex < quizSet.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

   const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };
  
  const handleAnswerSelect = (answer: string) => {
    if (isAnswered) return;
     setAnswers({
        ...answers,
        [currentQuestionIndex]: { selected: answer, isAnswered: true }
    });
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
        Nhập một chủ đề trong cài đặt và nhấp vào "Lưu" để tạo một bài kiểm tra.
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
                    <p className="font-bold text-base">{selectedAnswer === currentQuestion.answer ? "Chính xác!" : "Không chính xác."}</p>
                    <p className="text-base">{currentQuestion.explanation}</p>
                 </div>
            )}
          </div>
        ) : (
           <div className="text-center h-64 flex items-center justify-center">
            Không có bài kiểm tra nào.
          </div>
        )}
      </CardContent>
      <CardFooter className="flex-col !pt-0 gap-2">
         {quizSet.questions.length > 0 && (
          <div className="flex items-center justify-center w-full gap-4">
            <Button onClick={handlePrevQuestion} disabled={currentQuestionIndex === 0} variant="outline" size="icon">
              <ChevronLeft />
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Câu hỏi {currentQuestionIndex + 1} trên {quizSet.questions.length}
            </p>
            <Button onClick={handleNextQuestion} disabled={currentQuestionIndex === quizSet.questions.length - 1} variant="outline" size="icon">
              <ChevronRight />
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
