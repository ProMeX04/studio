
"use client";

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Label } from './ui/label';
import { ChevronLeft, ChevronRight, HelpCircle, Loader } from 'lucide-react';
import { explainQuizOption } from '@/ai/flows/explain-quiz-option';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { QuizQuestion, QuizSet } from '@/ai/schemas';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export interface AnswerState {
  [questionIndex: number]: {
      selected: string | null;
      isAnswered: boolean;
      explanations?: { [option: string]: string };
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
  const [isExplaining, setIsExplaining] = useState<string | null>(null); // Option being explained
  const { toast } = useToast();

  const currentAnswerState = answers[currentQuestionIndex] || { selected: null, isAnswered: false, explanations: {} };
  const { selected: selectedAnswer, isAnswered } = currentAnswerState;

  useEffect(() => {
    if (quizSet) { // Only update state if there's a quizSet
        const newInitialState = initialState || { currentQuestionIndex: 0, answers: {} };
        setCurrentQuestionIndex(newInitialState.currentQuestionIndex);
        setAnswers(newInitialState.answers);
    } else {
        // Reset if there is no quizSet
        setCurrentQuestionIndex(0);
        setAnswers({});
    }
  }, [quizSet, initialState]);


  useEffect(() => {
    if (quizSet) { // Only call onStateChange if there is a quizSet to avoid writing null state
        onStateChange({ currentQuestionIndex, answers });
    }
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
        [currentQuestionIndex]: { ...currentAnswerState, selected: answer, isAnswered: true }
    });
  };

  const handleExplain = useCallback(async (option: string) => {
    if (!quizSet || !currentQuestion) return;

    // Do not fetch again if explanation already exists
    if (currentAnswerState.explanations?.[option]) return;

    setIsExplaining(option);
    try {
        const result = await explainQuizOption({
            topic: quizSet.topic,
            question: currentQuestion.question,
            selectedOption: option,
            correctAnswer: currentQuestion.answer,
        });

        const newExplanations = { ...(currentAnswerState.explanations || {}), [option]: result.explanation };
        setAnswers(prev => ({
            ...prev,
            [currentQuestionIndex]: {
                ...prev[currentQuestionIndex],
                explanations: newExplanations
            }
        }));

    } catch (error) {
        console.error("Failed to get explanation", error);
        toast({
            title: "Lỗi",
            description: "Không thể lấy giải thích chi tiết. Vui lòng thử lại.",
            variant: "destructive"
        })
    } finally {
        setIsExplaining(null);
    }
  }, [quizSet, currentQuestion, currentAnswerState, currentQuestionIndex, toast]);

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
                <div key={index} className="space-y-2">
                    <div className="flex items-center gap-2">
                        <Label
                        className={cn(
                            "flex-grow flex items-center gap-4 p-4 rounded-lg border transition-colors text-lg",
                            getOptionClass(option)
                        )}
                        >
                            <RadioGroupItem value={option} id={`option-${index}`} />
                            {option}
                        </Label>
                        {isAnswered && (
                            <Button 
                                size="icon" 
                                variant="ghost" 
                                onClick={() => handleExplain(option)}
                                disabled={isExplaining !== null}
                                className="shrink-0"
                            >
                                {isExplaining === option ? <Loader className="animate-spin" /> : <HelpCircle />}
                            </Button>
                        )}
                    </div>
                     {currentAnswerState.explanations?.[option] && (
                        <Alert variant="default" className="bg-secondary/20 backdrop-blur">
                            <HelpCircle className="h-4 w-4" />
                            <AlertTitle>Giải thích chi tiết</AlertTitle>
                            <AlertDescription className="prose dark:prose-invert prose-p:my-0">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {currentAnswerState.explanations[option]}
                                </ReactMarkdown>
                            </AlertDescription>
                        </Alert>
                    )}
                </div>
              ))}
            </RadioGroup>
            {isAnswered && (
                 <div className={cn(
                    "p-4 rounded-lg backdrop-blur prose dark:prose-invert max-w-none prose-p:my-1",
                    selectedAnswer === currentQuestion.answer 
                      ? "bg-primary/20"
                      : "bg-destructive/20"
                 )}>
                    <p className="font-bold text-base !my-0">{selectedAnswer === currentQuestion.answer ? "Chính xác!" : "Không chính xác."}</p>
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
