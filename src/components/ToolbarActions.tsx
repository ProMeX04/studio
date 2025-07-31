
"use client";

import React from 'react';
import { Award, CheckCircle } from 'lucide-react';
import { useAppContext } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";

// --- Individual Action Components ---

const TheoryActions = () => {
    const { theorySet, theoryState, theoryChapterIndex, showTheorySummary, setShowTheorySummary } = useAppContext();
    const hasContent = (theorySet?.chapters.length ?? 0) > 0;
    const isSummaryActive = showTheorySummary;
    const isCurrentItemUnderstood = theoryState?.understoodIndices.includes(theoryChapterIndex) ?? false;

    const handleToggleUnderstood = () => {
        const { theoryState, onTheoryStateChange, theoryChapterIndex } = useAppContext();
        if (!theoryState) return;
        const newUnderstoodIndices = [...theoryState.understoodIndices];
        const indexPosition = newUnderstoodIndices.indexOf(theoryChapterIndex);
        if (indexPosition > -1) {
            newUnderstoodIndices.splice(indexPosition, 1);
        } else {
            newUnderstoodIndices.push(theoryChapterIndex);
        }
        onTheoryStateChange({ understoodIndices: newUnderstoodIndices });
    };

    return (
        <>
            <Button
                onClick={handleToggleUnderstood}
                disabled={!hasContent || isSummaryActive}
                variant={isCurrentItemUnderstood ? "default" : "outline"}
                size="icon"
                className="h-9 w-9"
            >
                <CheckCircle className="w-4 h-4" />
            </Button>
            <Button
                onClick={() => setShowTheorySummary(true)}
                disabled={!hasContent || isSummaryActive}
                variant="outline"
                size="icon"
                className="h-9 w-9"
            >
                <Award className="w-4 h-4" />
            </Button>
        </>
    );
};

const FlashcardActions = () => {
    const { flashcardSet, flashcardState, flashcardIndex, showFlashcardSummary, setShowFlashcardSummary } = useAppContext();
    const hasContent = (flashcardSet?.cards.length ?? 0) > 0;
    const isSummaryActive = showFlashcardSummary;
    const isCurrentItemUnderstood = flashcardState?.understoodIndices.includes(flashcardIndex) ?? false;

    const handleToggleUnderstood = () => {
        const { flashcardState, onFlashcardStateChange, flashcardIndex } = useAppContext();
        if (!flashcardState) return;
        const newUnderstoodIndices = [...flashcardState.understoodIndices];
        const indexPosition = newUnderstoodIndices.indexOf(flashcardIndex);
        if (indexPosition > -1) {
            newUnderstoodIndices.splice(indexPosition, 1);
        } else {
            newUnderstoodIndices.push(flashcardIndex);
        }
        onFlashcardStateChange({ understoodIndices: newUnderstoodIndices });
    };

    return (
        <>
            <Button
                onClick={handleToggleUnderstood}
                disabled={!hasContent || isSummaryActive}
                variant={isCurrentItemUnderstood ? "default" : "outline"}
                size="icon"
                className="h-9 w-9"
            >
                <CheckCircle className="w-4 h-4" />
            </Button>
            <Button
                onClick={() => setShowFlashcardSummary(true)}
                disabled={!hasContent || isSummaryActive}
                variant="outline"
                size="icon"
                className="h-9 w-9"
            >
                <Award className="w-4 h-4" />
            </Button>
        </>
    );
};

const QuizActions = () => {
    const { quizSet, showQuizSummary, setShowQuizSummary } = useAppContext();
    const hasContent = (quizSet?.questions.length ?? 0) > 0;
    const isSummaryActive = showQuizSummary;

    return (
        <Button
            onClick={() => setShowQuizSummary(true)}
            disabled={!hasContent || isSummaryActive}
            variant="outline"
            size="icon"
            className="h-9 w-9"
        >
            <Award className="h-4 w-4" />
        </Button>
    );
};

// --- Registry and Main Component ---

const actionRegistry = {
    theory: TheoryActions,
    flashcards: FlashcardActions,
    quiz: QuizActions,
};

export function ToolbarActions() {
    const { view } = useAppContext();
    const ActionsComponent = actionRegistry[view];

    return ActionsComponent ? <ActionsComponent /> : null;
}
