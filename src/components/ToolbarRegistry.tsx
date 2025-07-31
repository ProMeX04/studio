
"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings } from '@/components/Settings';
import { AdvancedVoiceChat } from '@/components/AdvancedVoiceChat';
import { CheckCircle, Award, ChevronLeft, ChevronRight } from 'lucide-react';

// --- Individual Toolbar Components ---

const SelectView = ({ value, onValueChange }: { value: string, onValueChange: (v: string) => void }) => (
    <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Chọn chế độ" />
        </SelectTrigger>
        <SelectContent>
            <SelectItem value="theory">Lý thuyết</SelectItem>
            <SelectItem value="flashcards">Flashcard</SelectItem>
            <SelectItem value="quiz">Trắc nghiệm</SelectItem>
        </SelectContent>
    </Select>
);

const NavControls = ({ onPrev, onNext, isDisabled, isPrevDisabled, isNextDisabled, label }: any) => (
    <div className="flex items-center gap-2">
        <Button onClick={onPrev} disabled={isDisabled || isPrevDisabled} variant="outline" size="icon" className="h-9 w-9">
            <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm text-muted-foreground w-24 text-center">{label}</span>
        <Button onClick={onNext} disabled={isDisabled || isNextDisabled} variant="outline" size="icon" className="h-9 w-9">
            <ChevronRight className="h-4 w-4" />
        </Button>
    </div>
);

const ViewActions = (props: any) => {
    const { 
        view, isSummaryActive, 
        hasTheoryContent, onToggleTheoryUnderstood, isCurrentTheoryUnderstood, onShowTheorySummary,
        hasFlashcardContent, onToggleFlashcardUnderstood, isCurrentFlashcardUnderstood, onShowFlashcardSummary,
        hasQuizContent, onShowQuizSummary,
    } = props;

    switch (view) {
        case 'theory':
            return (
                <>
                    <Button onClick={onToggleTheoryUnderstood} disabled={!hasTheoryContent || isSummaryActive} variant={isCurrentTheoryUnderstood ? "default" : "outline"} size="icon" className="h-9 w-9">
                        <CheckCircle className="w-4 h-4" />
                    </Button>
                    <Button onClick={onShowTheorySummary} disabled={!hasTheoryContent || isSummaryActive} variant="outline" size="icon" className="h-9 w-9">
                        <Award className="w-4 h-4" />
                    </Button>
                </>
            );
        case 'flashcards':
            return (
                <>
                    <Button onClick={onToggleFlashcardUnderstood} disabled={!hasFlashcardContent || isSummaryActive} variant={isCurrentFlashcardUnderstood ? "default" : "outline"} size="icon" className="h-9 w-9">
                        <CheckCircle className="w-4 h-4" />
                    </Button>
                    <Button onClick={onShowFlashcardSummary} disabled={!hasFlashcardContent || isSummaryActive} variant="outline" size="icon" className="h-9 w-9">
                        <Award className="w-4 h-4" />
                    </Button>
                </>
            );
        case 'quiz':
            return (
                <Button onClick={onShowQuizSummary} disabled={!hasQuizContent || isSummaryActive} variant="outline" size="icon" className="h-9 w-9">
                    <Award className="h-4 w-4" />
                </Button>
            );
        default:
            return null;
    }
};


// --- Component Registry ---

export const toolbarRegistry: { [key: string]: React.ComponentType<any> } = {
    SelectView,
    NavControls,
    ViewActions,
    Settings,
    AdvancedVoiceChat,
};
