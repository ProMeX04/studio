
"use client"

import React, { useMemo } from 'react';
import { useAppContext } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Settings } from "@/components/Settings";
import { AdvancedVoiceChat } from "@/components/AdvancedVoiceChat";

interface ToolbarProps {
    actions: React.ReactNode;
}

export function Toolbar({ actions }: ToolbarProps) {
    const {
        // View and Index State
        view,
        onViewChange,
        flashcardSet,
        quizSet,
        theorySet,
        flashcardIndex,
        currentQuestionIndex,
        theoryChapterIndex,
        onFlashcardIndexChange,
        onCurrentQuestionIndexChange,
        onTheoryChapterIndexChange,
        showQuizSummary,
        showFlashcardSummary,
        showTheorySummary,

        // Settings and Global State
        visibility,
        onVisibilityChange,
        onBackgroundChange,
        onUploadedBackgroundsChange,
        uploadedBackgrounds,
        backgroundImage,
        onSettingsSave,
        onGenerate,
        handleClearLearningData,
        isLoading,
        topic,
        language,
        model,
        onApiKeysChange,
        handleResetOnboarding,
        apiKeys,
        apiKeyIndex,
        handleApiKeyIndexChange,
    } = useAppContext();

    const totalItems = useMemo(() => {
        switch (view) {
            case 'flashcards': return flashcardSet?.cards.length ?? 0;
            case 'quiz': return quizSet?.questions.length ?? 0;
            case 'theory': return theorySet?.outline?.length ?? 0;
            default: return 0;
        }
    }, [view, flashcardSet, quizSet, theorySet]);

    const currentIndex = useMemo(() => {
        switch (view) {
            case 'flashcards': return flashcardIndex;
            case 'quiz': return currentQuestionIndex;
            case 'theory': return theoryChapterIndex;
            default: return 0;
        }
    }, [view, flashcardIndex, currentQuestionIndex, theoryChapterIndex]);

    const hasContent = totalItems > 0;
    const isSummaryActive = showQuizSummary || showFlashcardSummary || showTheorySummary;
    const isNavDisabled = isSummaryActive || !hasContent;

    const handleNext = () => {
        if (currentIndex < totalItems - 1) {
            switch (view) {
                case 'flashcards': onFlashcardIndexChange(currentIndex + 1); break;
                case 'quiz': onCurrentQuestionIndexChange(currentIndex + 1); break;
                case 'theory': onTheoryChapterIndexChange(currentIndex + 1); break;
            }
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            switch (view) {
                case 'flashcards': onFlashcardIndexChange(currentIndex - 1); break;
                case 'quiz': onCurrentQuestionIndexChange(currentIndex - 1); break;
                case 'theory': onTheoryChapterIndexChange(currentIndex - 1); break;
            }
        }
    };
    
    const settingsProps = {
        scope: "all" as const,
        onVisibilityChange,
        onBackgroundChange,
        onUploadedBackgroundsChange,
        visibility,
        uploadedBackgrounds,
        currentBackgroundImage: backgroundImage,
        onSettingsChange: onSettingsSave,
        onGenerate,
        onClearLearningData: handleClearLearningData,
        isLoading,
        topic,
        language,
        model,
        onApiKeysChange,
        onResetOnboarding: handleResetOnboarding,
        apiKeys,
        theorySet,
        flashcardSet,
        quizSet,
    };

    const voiceChatProps = {
        apiKeys,
        apiKeyIndex,
        onApiKeyIndexChange: handleApiKeyIndexChange,
    };

    return (
        <div className="flex flex-wrap items-center justify-center gap-2 bg-background/30 backdrop-blur-sm p-2 rounded-md">
            <Select
                value={view}
                onValueChange={(value) => onViewChange(value as any)}
            >
                <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Chọn chế độ" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="theory">Lý thuyết</SelectItem>
                    <SelectItem value="flashcards">Flashcard</SelectItem>
                    <SelectItem value="quiz">Trắc nghiệm</SelectItem>
                </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
                <Button
                    onClick={handlePrev}
                    disabled={isNavDisabled || currentIndex === 0}
                    variant="outline"
                    size="icon"
                    className="h-9 w-9"
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>

                <span className="text-sm text-muted-foreground w-24 text-center">
                    {view === "flashcards" ? "Thẻ" : view === "quiz" ? "Câu hỏi" : "Chương"}{" "}
                    {hasContent ? currentIndex + 1 : 0} / {totalItems}
                </span>

                <Button
                    onClick={handleNext}
                    disabled={isNavDisabled || currentIndex >= totalItems - 1}
                    variant="outline"
                    size="icon"
                    className="h-9 w-9"
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>

                {actions}

                <Settings {...settingsProps} />

                {visibility.advancedVoiceChat && (
                    <AdvancedVoiceChat {...voiceChatProps} />
                )}
            </div>
        </div>
    );
}
