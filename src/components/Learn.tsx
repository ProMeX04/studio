

"use client"

import React, { useMemo } from "react"
import { Flashcards } from "@/components/Flashcards"
import { Quiz } from "@/components/Quiz"
import { Theory } from "@/components/Theory"
import { QuizSummary } from "@/components/QuizSummary"
import { FlashcardSummary } from "@/components/FlashcardSummary"
import { TheorySummary } from "@/components/TheorySummary"
import { useLearningContext } from "@/contexts/LearningContext"

// --- Component Registries ---
const viewRegistry = {
	flashcards: Flashcards,
	quiz: Quiz,
	theory: Theory,
}

const summaryRegistry = {
	flashcards: FlashcardSummary,
	quiz: QuizSummary,
	theory: TheorySummary,
}
// --------------------------

export function Learn() {
	const {
		view,
		flashcardSet,
		quizSet,
		theorySet,
		quizState,
		showQuizSummary,
		setShowQuizSummary,
		showFlashcardSummary,
		setShowFlashcardSummary,
		showTheorySummary,
		setShowTheorySummary,
		flashcardState,
		onFlashcardReset,
		theoryState,
		onTheoryReset,
	} = useLearningContext()

	const quizSummaryData = React.useMemo(() => {
		if (!quizSet?.questions || !quizState) {
			return { correctAnswers: 0, incorrectAnswers: 0, unansweredQuestions: (quizSet?.questions?.length ?? 0) }
		}
		let correct = 0
		const answeredIndices = Object.keys(quizState.answers).map(Number)
		for (const index of answeredIndices) {
			const question = quizSet.questions[index]
			const answer = quizState.answers[index]
			if (question && answer && answer.selected === question.answer) {
				correct++
			}
		}
		const answeredCount = answeredIndices.length
		return {
			correctAnswers: correct,
			incorrectAnswers: answeredCount - correct,
			unansweredQuestions: quizSet.questions.length - answeredCount,
		}
	}, [quizSet, quizState])

	const flashcardSummaryData = React.useMemo(() => {
		if (!flashcardSet || !flashcardState) {
			return { understoodCount: 0, notUnderstoodCount: (flashcardSet?.cards?.length ?? 0) }
		}
		const understood = flashcardState.understoodIndices.length
		return {
			understoodCount: understood,
			notUnderstoodCount: (flashcardSet.cards.length ?? 0) - understood,
		}
	}, [flashcardSet, flashcardState])

	const theorySummaryData = React.useMemo(() => {
		if (!theorySet || !theoryState) {
			return { understoodCount: 0, notUnderstoodCount: (theorySet?.chapters?.length ?? 0) }
		}
		const understood = theoryState.understoodIndices.length
		return {
			understoodCount: understood,
			notUnderstoodCount: (theorySet.chapters.length ?? 0) - understood,
		}
	}, [theorySet, theoryState])
    
	const allQuestionsAnswered = quizSet && quizSummaryData.unansweredQuestions === 0
	const shouldShowQuizSummary = (showQuizSummary || allQuestionsAnswered) && view === "quiz"

	const allFlashcardsMarked = flashcardSet && flashcardSummaryData.understoodCount === (flashcardSet?.cards?.length ?? 0)
	const shouldShowFlashcardSummary = (showFlashcardSummary || allFlashcardsMarked) && view === "flashcards"

	const allTheoryChaptersMarked = theorySet && theorySummaryData.understoodCount === (theorySet?.chapters?.length ?? 0)
	const shouldShowTheorySummary = (showTheorySummary || allTheoryChaptersMarked) && view === "theory"
    
    // --- Prop Collections ---
    const summaryProps = {
        flashcards: {
            ...flashcardSummaryData,
            totalCards: (flashcardSet?.cards?.length ?? 0),
            onReset: onFlashcardReset,
            onBack: () => setShowFlashcardSummary(false),
            isCompleted: allFlashcardsMarked,
        },
        quiz: {
            ...quizSummaryData,
            totalQuestions: (quizSet?.questions?.length ?? 0),
            onBack: () => setShowQuizSummary(false),
            isCompleted: allQuestionsAnswered,
        },
        theory: {
            ...theorySummaryData,
            totalChapters: (theorySet?.chapters?.length ?? 0),
            onReset: onTheoryReset,
            onBack: () => setShowTheorySummary(false),
            isCompleted: allTheoryChaptersMarked,
        },
    }
    // ------------------------

    const renderContent = () => {
        const isSummaryView = shouldShowFlashcardSummary || shouldShowQuizSummary || shouldShowTheorySummary;
        
        if (isSummaryView) {
            const SummaryComponent = summaryRegistry[view]
            if (!SummaryComponent) return null;
            // @ts-ignore
            return <SummaryComponent {...summaryProps[view]} />;
        }
        
        const ViewComponent = viewRegistry[view];
        if (!ViewComponent) return null;
        // @ts-ignore
        return <ViewComponent />;
    }

	return (
		<div className="w-full h-full relative">
			<div className="h-full w-full overflow-y-auto pb-20">{renderContent()}</div>
		</div>
	)
}
