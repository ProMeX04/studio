
"use client";

import { Award, Target, RefreshCw, Undo2 } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';

interface QuizSummaryProps {
    correctAnswers: number;
    totalQuestions: number;
    onReset: () => void;
    onBack: () => void;
    isCompleted: boolean;
}

export function QuizSummary({ correctAnswers, totalQuestions, onReset, onBack, isCompleted }: QuizSummaryProps) {
    const accuracy = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;

    let medalColor = "text-gray-400";
    if (accuracy >= 90) {
        medalColor = "text-yellow-400";
    } else if (accuracy >= 70) {
        medalColor = "text-gray-300";
    } else if (accuracy >= 50) {
        medalColor = "text-yellow-600";
    }

    return (
        <div className="flex-grow flex items-center justify-center">
            <Card className="w-full max-w-md text-center bg-background/80 backdrop-blur-sm">
                <CardHeader>
                    <div className="mx-auto mb-4">
                        <Award size={64} className={medalColor} />
                    </div>
                    <CardTitle className="text-2xl">{isCompleted ? "Chúc mừng bạn đã hoàn thành!" : "Báo cáo tiến độ"}</CardTitle>
                    <CardDescription>Đây là kết quả của bạn tính đến hiện tại:</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex justify-around">
                        <div className="flex flex-col items-center space-y-1">
                            <span className="text-4xl font-bold text-success">{correctAnswers}</span>
                            <span className="text-sm text-muted-foreground">Đúng</span>
                        </div>
                        <div className="flex flex-col items-center space-y-1">
                            <span className="text-4xl font-bold text-destructive">{totalQuestions - correctAnswers}</span>
                            <span className="text-sm text-muted-foreground">Sai</span>
                        </div>
                        <div className="flex flex-col items-center space-y-1">
                            <span className="text-4xl font-bold">{totalQuestions}</span>
                            <span className="text-sm text-muted-foreground">Tổng</span>
                        </div>
                    </div>
                    <div className="flex flex-col items-center space-y-2">
                        <div className="flex items-center gap-2">
                            <Target size={24} />
                            <span className="text-xl font-semibold">Tỷ lệ chính xác</span>
                        </div>
                        <span className="text-5xl font-bold tracking-tight">{accuracy.toFixed(0)}%</span>
                    </div>
                </CardContent>
                <CardFooter className="flex-col gap-4">
                    <Button onClick={onReset} className="w-full">
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Làm lại từ đầu
                    </Button>
                     <Button onClick={onBack} className="w-full" variant="outline">
                        <Undo2 className="mr-2 h-4 w-4" />
                        Quay lại
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
