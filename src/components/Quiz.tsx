
"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Label } from './ui/label';
import { ChevronLeft, ChevronRight, HelpCircle, Loader } from 'lucide-react';
import { explainQuizOption } from '@/ai/flows/explain-quiz-option';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { QuizQuestion, QuizSet, ExplainQuizOptionOutput } from '@/ai/schemas';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

export interface AnswerState {
  [questionIndex: number]: {
      selected: string | null;
      isAnswered: boolean;
      explanations?: { [option: string]: ExplainQuizOptionOutput };
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
    if (currentAnswerState.explanations?.[option]) {
        return;
    }

    setIsExplaining(option);
    try {
        const result = await explainQuizOption({
            topic: quizSet.topic,
            question: currentQuestion.question,
            selectedOption: option,
            correctAnswer: currentQuestion.answer,
        });

        const newExplanations = { ...(currentAnswerState.explanations || {}), [option]: result };
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
    if (!isAnswered) return 'border-border cursor-pointer hover:bg-accent/50 bg-background/80 backdrop-blur-sm';

    const isCorrect = option === currentQuestion?.answer;
    const isSelectedWrong = option === selectedAnswer && selectedAnswer !== currentQuestion?.answer;

    if (isCorrect) return 'bg-success/80 border-success backdrop-blur-sm';
    if (isSelectedWrong) return 'bg-destructive/50 border-destructive backdrop-blur-sm';
    return 'border-border bg-background/80 backdrop-blur-sm';
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
             <div className="text-2xl font-semibold text-center bg-background/50 backdrop-blur rounded-lg p-6 prose dark:prose-invert max-w-none prose-p:my-0 prose-headings:my-2">
                <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>{currentQuestion.question}</ReactMarkdown>
             </div>
            <RadioGroup 
                value={selectedAnswer ?? ''} 
                onValueChange={handleAnswerSelect}
                disabled={isAnswered}
                className="space-y-3"
            >
              {currentQuestion.options.map((option, index) => (
                <div key={index} className="space-y-2">
                    <Label
                        htmlFor={`option-${index}`}
                        className={cn(
                            "flex items-center justify-between gap-4 p-4 rounded-lg border transition-colors text-lg",
                            getOptionClass(option)
                        )}
                    >
                        <div className="flex items-center gap-4 prose dark:prose-invert max-w-none prose-p:my-0">
                           <RadioGroupItem value={option} id={`option-${index}`} />
                           <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>{option}</ReactMarkdown>
                        </div>
                        <Button
                            size="icon"
                            variant="ghost"
                            onClick={(e) => {
                                e.preventDefault();
                                handleExplain(option);
                            }}
                            disabled={isExplaining !== null}
                            className={cn(
                                "shrink-0 transition-opacity",
                                !isAnswered && "opacity-0 pointer-events-none"
                            )}
                        >
                            {isExplaining === option ? <Loader className="animate-spin" /> : <HelpCircle />}
                        </Button>
                    </Label>

                     {currentAnswerState.explanations?.[option] && (
                        <Alert variant="default" className="bg-secondary/20 backdrop-blur">
                            <HelpCircle className="h-4 w-4" />
                            <AlertTitle>Giải thích chi tiết</AlertTitle>
                            <AlertDescription className="prose dark:prose-invert max-w-none prose-p:my-0 text-base">
                                <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
                                    {currentAnswerState.explanations[option].explanation}
                                </ReactMarkdown>
                            </AlertDescription>
                        </Alert>
                    )}
                </div>
              ))}
            </RadioGroup>
            {isAnswered && (
                 <Alert className={cn(
                    "backdrop-blur prose dark:prose-invert max-w-none prose-p:my-1 text-base",
                    selectedAnswer === currentQuestion.answer 
                      ? "bg-success/20"
                      : "bg-destructive/20"
                 )}>
                    <AlertTitle className="font-bold text-base !my-0">{selectedAnswer === currentQuestion.answer ? "Chính xác!" : "Không chính xác."}</AlertTitle>
                    <AlertDescription className="prose dark:prose-invert max-w-none prose-p:my-0 text-base">
                        <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>{currentQuestion.explanation}</ReactMarkdown>
                    </AlertDescription>
                 </Alert>
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
          <div className="inline-flex items-center justify-center bg-background/30 backdrop-blur-sm p-2 rounded-md">
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
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
