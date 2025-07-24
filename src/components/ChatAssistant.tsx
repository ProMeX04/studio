
"use client";

import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader, Send, Sparkles, User, RefreshCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { askQuestion } from '@/ai/flows/ask-question';
import { type ChatMessage } from '@/ai/schemas';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';


interface ChatAssistantProps {
  context: string;
}

interface ChatInputFormProps {
    input: string;
    setInput: (value: string) => void;
    handleSubmit: (e: React.FormEvent, question?: string) => Promise<void>;
    isLoading: boolean;
    className?: string;
}

function ChatInputForm({ input, setInput, handleSubmit, isLoading, className }: ChatInputFormProps) {
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    return (
         <form onSubmit={(e) => handleSubmit(e)} className={cn("flex w-full items-center gap-2", className)}>
            <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Hỏi AI về flashcard hoặc câu hỏi trắc nghiệm này..."
                className="min-h-0 resize-none"
                rows={1}
                disabled={isLoading}
                onKeyDown={handleKeyDown}
            />
            <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
                {isLoading ? <Loader className="animate-spin" /> : <Send />}
            </Button>
        </form>
    );
}

export function ChatAssistant({ context }: ChatAssistantProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
        const viewport = scrollAreaRef.current.querySelector('div');
        if (viewport) {
             viewport.scrollTop = viewport.scrollHeight;
        }
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent, question?: string) => {
    e.preventDefault();
    const questionToSend = question || input;
    if (!questionToSend.trim() || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', text: questionToSend };
    
    // Hide suggestions from previous model message
    setMessages(prev => {
        const newMessages = [...prev];
        const lastMessage = newMessages[newMessages.length - 1];
        if (lastMessage?.role === 'model') {
            lastMessage.suggestions = undefined;
        }
        return [...newMessages, userMessage];
    });

    setInput('');
    setIsLoading(true);

    try {
      const flowInput = {
        context,
        question: questionToSend,
        history: messages,
      };
      
      const result = await askQuestion(flowInput);

      if (result.answer) {
        const modelMessage: ChatMessage = { role: 'model', text: result.answer, suggestions: result.suggestions };
        setMessages(prev => [...prev, modelMessage]);
      } else {
        throw new Error('AI did not return an answer.');
      }
    } catch (error) {
      console.error("Error asking question:", error);
      toast({
        title: 'Lỗi',
        description: 'Không thể nhận câu trả lời từ AI. Vui lòng thử lại.',
        variant: 'destructive',
      });
      // remove the user message if the call fails
       setMessages(prev => prev.slice(0, prev.length -1));
    } finally {
      setIsLoading(false);
    }
  };
  
  const resetChat = () => {
    setMessages([]);
    setInput('');
    setIsLoading(false);
    toast({ title: "Cuộc trò chuyện đã được làm mới."})
  }

  const chatInputProps = {
    input,
    setInput,
    handleSubmit,
    isLoading,
  };


  if (messages.length === 0) {
    return (
        <div className="w-full max-w-6xl mx-auto">
            <ChatInputForm {...chatInputProps} />
        </div>
    )
  }

  return (
    <Card className="w-full max-w-6xl mx-auto shadow-xl bg-background/50 backdrop-blur-lg">
      <CardContent className="pt-6">
        <ScrollArea className="h-64 w-full pr-4" ref={scrollAreaRef}>
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={cn(
                  "flex items-start gap-3",
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {message.role === 'model' && (
                  <div className="p-2 bg-primary rounded-full text-primary-foreground">
                    <Sparkles className="h-5 w-5" />
                  </div>
                )}
                <div className="flex-1 space-y-2">
                    <div
                        className={cn(
                            "rounded-lg p-3 max-w-[90%] prose dark:prose-invert prose-p:my-0 prose-headings:my-1",
                            message.role === 'user'
                            ? "bg-primary/80 text-primary-foreground float-right"
                            : "bg-muted text-muted-foreground",
                             {"max-w-full": message.role === 'model'}
                        )}
                        >
                        <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>{message.text}</ReactMarkdown>
                    </div>
                     {message.role === 'model' && message.suggestions && message.suggestions.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-2">
                            {message.suggestions.map((suggestion, i) => (
                                <Button
                                    key={i}
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => handleSubmit(e, suggestion)}
                                    className="bg-background/50 backdrop-blur"
                                >
                                    {suggestion}
                                </Button>
                            ))}
                        </div>
                    )}
                </div>
                 {message.role === 'user' && (
                  <div className="p-2 bg-muted rounded-full text-muted-foreground">
                    <User className="h-5 w-5" />
                  </div>
                )}
              </div>
            ))}
             {isLoading && (
              <div className="flex items-start gap-3 justify-start">
                <div className="p-2 bg-primary rounded-full text-primary-foreground">
                    <Sparkles className="h-5 w-5" />
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <Loader className="animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
      <CardFooter>
        <ChatInputForm {...chatInputProps} />
      </CardFooter>
    </Card>
  );
}
