
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

interface ChatAssistantProps {
  context: string;
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const result = await askQuestion({
        context,
        question: input,
        history: messages,
      });

      if (result.answer) {
        const modelMessage: ChatMessage = { role: 'model', text: result.answer };
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

  return (
    <Card className="w-full max-w-6xl mx-auto shadow-xl bg-background/50 backdrop-blur-lg">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
            <Sparkles className="text-primary" />
            <CardTitle>Trợ lý AI</CardTitle>
        </div>
        <Button onClick={resetChat} variant="ghost" size="icon">
            <RefreshCcw className="h-5 w-5"/>
            <span className="sr-only">Làm mới cuộc trò chuyện</span>
        </Button>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-64 w-full pr-4" ref={scrollAreaRef}>
          <div className="space-y-4">
            {messages.length === 0 && (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                    Có câu hỏi nào về nội dung học tập này không? Hãy hỏi tôi!
                </div>
            )}
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
                <div
                  className={cn(
                    "rounded-lg p-3 max-w-[80%]",
                    message.role === 'user'
                      ? "bg-primary/80 text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  <p className="text-sm">{message.text}</p>
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
        <form onSubmit={handleSubmit} className="flex w-full items-center gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Hỏi AI về flashcard hoặc câu hỏi trắc nghiệm này..."
            className="min-h-0 resize-none"
            rows={1}
            disabled={isLoading}
            onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    handleSubmit(e);
                }
            }}
          />
          <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
            {isLoading ? <Loader className="animate-spin" /> : <Send />}
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}
