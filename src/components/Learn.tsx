
"use client"

import React, { useMemo } from "react"
import { useAppContext } from "@/contexts/AppContext"
import { Flashcards } from "@/components/Flashcards"
import { Quiz } from "@/components/Quiz"
import { Theory } from "@/components/Theory"
import { QuizSummary } from "@/components/QuizSummary"
import { FlashcardSummary } from "@/components/FlashcardSummary"
import { TheorySummary } from "@/components/TheorySummary"

export function Learn() {
	const {
		view,
		flashcardSet,
		quizSet,
		theorySet,
		quizState,
		onQuizStateChange,
		onQuizReset,
		flashcardIndex,
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
		topic,
		model,
		language,
		currentQuestionIndex,
		onCurrentQuestionIndexChange,
		theoryChapterIndex,
		apiKeys,
		apiKeyIndex,
		handleApiKeyIndexChange,
		handleGeneratePodcastForChapter,
		isGeneratingPodcast,
	} = useAppContext()

	const { correctAnswers, incorrectAnswers, unansweredQuestions } =
		React.useMemo(() => {
			if (!quizSet || !quizState) {
				return {
					correctAnswers: 0,
					incorrectAnswers: 0,
					unansweredQuestions: quizSet?.questions.length ?? 0,
				}
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
			const incorrect = answeredCount - correct
			const unanswered = quizSet.questions.length - answeredCount

			return {
				correctAnswers: correct,
				incorrectAnswers: incorrect,
				unansweredQuestions: unanswered,
			}
		}, [quizSet, quizState])

	const {
		understoodCount: flashcardUnderstood,
		notUnderstoodCount: flashcardNotUnderstood,
	} = React.useMemo(() => {
		if (!flashcardSet || !flashcardState) {
			return {
				understoodCount: 0,
				notUnderstoodCount: flashcardSet?.cards.length ?? 0,
			}
		}
		const understood = flashcardState.understoodIndices.length
		const total = flashcardSet.cards.length
		return {
			understoodCount: understood,
			notUnderstoodCount: total - understood,
		}
	}, [flashcardSet, flashcardState])

	const {
		understoodCount: theoryUnderstood,
		notUnderstoodCount: theoryNotUnderstood,
	} = React.useMemo(() => {
		if (!theorySet || !theoryState) {
			return {
				understoodCount: 0,
				notUnderstoodCount: theorySet?.chapters.length ?? 0,
			}
		}
		const understood = theoryState.understoodIndices.length
		const total = theorySet.chapters.length
		return {
			understoodCount: understood,
			notUnderstoodCount: total - understood,
		}
	}, [theorySet, theoryState])

	const allQuestionsAnswered = quizSet && unansweredQuestions === 0
	const shouldShowQuizSummary =
		(showQuizSummary || allQuestionsAnswered) && view === "quiz"

	const allFlashcardsMarked =
		flashcardSet && flashcardUnderstood === flashcardSet.cards.length
	const shouldShowFlashcardSummary =
		(showFlashcardSummary || allFlashcardsMarked) && view === "flashcards"

	const allTheoryChaptersMarked =
		theorySet && theoryUnderstood === theorySet.chapters.length
	const shouldShowTheorySummary =
		(showTheorySummary || allTheoryChaptersMarked) &&
		(view === "theory")

	const isCurrentItemUnderstood = useMemo(() => {
		if (view === "flashcards") {
			if (!flashcardState || !flashcardSet) return false
			return flashcardState.understoodIndices.includes(flashcardIndex)
		}
		if (view === "theory") {
			if (!theoryState || !theorySet) return false
			return theoryState.understoodIndices.includes(theoryChapterIndex)
		}
		return false
	}, [flashcardState, flashcardIndex, theoryState, theoryChapterIndex, view])

	const renderContent = () => {
		if (shouldShowQuizSummary && quizSet) {
			return (
				<QuizSummary
					correctAnswers={correctAnswers}
					incorrectAnswers={incorrectAnswers}
					unansweredQuestions={unansweredQuestions}
					totalQuestions={quizSet.questions.length}
					onReset={onQuizReset}
					onBack={() => setShowQuizSummary(false)}
					isCompleted={allQuestionsAnswered}
				/>
			)
		}
		if (shouldShowFlashcardSummary && flashcardSet) {
			return (
				<FlashcardSummary
					understoodCount={flashcardUnderstood}
					notUnderstoodCount={flashcardNotUnderstood}
					totalCards={flashcardSet.cards.length}
					onReset={onFlashcardReset}
					onBack={() => setShowFlashcardSummary(false)}
					isCompleted={allFlashcardsMarked}
				/>
			)
		}
		if (shouldShowTheorySummary && theorySet) {
			return (
				<TheorySummary
					understoodCount={theoryUnderstood}
					notUnderstoodCount={theoryNotUnderstood}
					totalChapters={theorySet.chapters.length}
					onReset={onTheoryReset}
					onBack={() => setShowTheorySummary(false)}
					isCompleted={allTheoryChaptersMarked}
				/>
			)
		}
		switch (view) {
			case "flashcards":
				return (
					<Flashcards
						flashcardSet={flashcardSet}
						flashcardIndex={flashcardIndex}
						topic={topic}
						isCurrentUnderstood={isCurrentItemUnderstood}
					/>
				)
			case "quiz":
				return (
					<Quiz
						quizSet={quizSet}
						quizState={quizState}
						onQuizStateChange={onQuizStateChange}
						language={language}
						topic={topic}
						model={model}
						currentQuestionIndex={currentQuestionIndex}
						onCurrentQuestionIndexChange={onCurrentQuestionIndexChange}
						apiKeys={apiKeys}
						apiKeyIndex={apiKeyIndex}
						onApiKeyIndexChange={handleApiKeyIndexChange}
					/>
				)
			case "theory":
				return (
					<Theory
						theorySet={theorySet}
						topic={topic}
						chapterIndex={theoryChapterIndex}
						isCurrentUnderstood={isCurrentItemUnderstood}
						onGeneratePodcast={handleGeneratePodcastForChapter}
						isGeneratingPodcast={isGeneratingPodcast}
					/>
				)
			default:
				return (
					<Theory
						theorySet={theorySet}
						topic={topic}
						chapterIndex={theoryChapterIndex}
						isCurrentUnderstood={isCurrentItemUnderstood}
						onGeneratePodcast={handleGeneratePodcastForChapter}
						isGeneratingPodcast={isGeneratingPodcast}
					/>
				)
		}
	}

	return (
		<div className="w-full h-full relative">
			<div className="h-full w-full overflow-y-auto pb-20">{renderContent()}</div>
		</div>
	)
}
