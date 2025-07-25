
"use client";

import { Award, RefreshCw, Undo2, CircleHelp, CheckCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';

interface FlashcardSummaryProps {
    understoodCount: number;
    notUnderstoodCount: number;
    totalCards: number;
    onReset: () => void;
    onBack: () => void;
    isCompleted: boolean;
}

export function FlashcardSummary({ 
    understoodCount,
    notUnderstoodCount,
    totalCards,
    onReset, 
    onBack, 
    isCompleted 
}: FlashcardSummaryProps) {
    
    const progress = totalCards > 0 ? (understoodCount / totalCards) * 100 : 0;

    let medalColor = "text-gray-400";
    if (progress >= 90) {
        medalColor = "text-yellow-400";
    } else if (progress >= 70) {
        medalColor = "text-gray-300";
    } else if (progress >= 50) {
        medalColor = "text-yellow-600";
    }

    return (
        <div className="flex-grow flex items-center justify-center">
            <Card className="w-full max-w-md text-center bg-background/80 backdrop-blur-sm">
                <CardHeader>
                    <div className="mx-auto mb-4">
                        <Award size={64} className={medalColor} />
                    </div>
                    <CardTitle className="text-2xl">{isCompleted ? "Tuyệt vời! Bạn đã học hết bộ thẻ!" : "Báo cáo tiến độ"}</CardTitle>
                    <CardDescription>Đây là kết quả của bạn tính đến hiện tại:</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-2 gap-4 text-center">
                        <div className="flex flex-col items-center space-y-1 p-2 rounded-lg bg-success/10">
                            <span className="text-4xl font-bold text-success">{understoodCount}</span>
                            <span className="text-sm text-muted-foreground">Đã hiểu</span>
                        </div>
                        <div className="flex flex-col items-center space-y-1 p-2 rounded-lg bg-muted/50">
                            <span className="text-4xl font-bold text-muted-foreground">{notUnderstoodCount}</span>
                            <span className="text-sm text-muted-foreground">Chưa hiểu</span>
                        </div>
                    </div>
                     <div className="flex flex-col items-center space-y-2 pt-4">
                        <div className="flex items-center gap-2">
                            <CheckCircle size={24} />
                            <span className="text-xl font-semibold">Tiến độ</span>
                        </div>
                        <span className="text-5xl font-bold tracking-tight">{progress.toFixed(0)}%</span>
                        <span className="text-sm text-muted-foreground">({understoodCount} / {totalCards} thẻ)</span>
                    </div>
                </CardContent>
                <CardFooter className="flex-col gap-4">
                    <Button onClick={onReset} className="w-full">
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Học lại từ đầu
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
