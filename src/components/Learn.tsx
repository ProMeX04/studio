
"use client"

import React, { useMemo } from "react"
import { useAppContext } from "@/contexts/AppContext"
import { Flashcards } from "@/components/Flashcards"
import { Quiz } from "@/components/Quiz"
import { Theory } from "@/components/Theory"
import { Podcast } from "@/components/Podcast"
import { QuizSummary } from "@/components/QuizSummary"
import { FlashcardSummary } from "@/components/FlashcardSummary"
import { TheorySummary } from "@/components/TheorySummary"
import { Settings } from "@/components/Settings"
import {
	ChevronLeft,
	ChevronRight,
	Award,
	CheckCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import { AdvancedVoiceChat } from "@/components/AdvancedVoiceChat"

export function Learn() {
	const {
		view,
		isLoading,
		flashcardSet,
		quizSet,
		theorySet,
		quizState,
		onQuizStateChange,
		onQuizReset,
		flashcardIndex,
		onFlashcardIndexChange,
		onViewChange,
		language,
		topic,
		model,
		onModelChange,
		showQuizSummary,
		setShowQuizSummary,
		showFlashcardSummary,
		setShowFlashcardSummary,
		showTheorySummary,
		setShowTheorySummary,
		flashcardState,
		onFlashcardStateChange,
		onFlashcardReset,
		theoryState,
		onTheoryStateChange,
		onTheoryReset,
		onSettingsSave,
		onGenerate,
		handleClearLearningData,
		handleResetOnboarding,
		currentQuestionIndex,
		onCurrentQuestionIndexChange,
		theoryChapterIndex,
		onTheoryChapterIndexChange,
		apiKeys,
		apiKeyIndex,
		handleApiKeyIndexChange,
		onApiKeysChange,
		handleGeneratePodcastForChapter,
		isGeneratingPodcast,
		visibility,
	} = useAppContext()

	const currentCount =
		view === "flashcards"
			? flashcardSet?.cards.length ?? 0
			: view === "quiz"
			  ? quizSet?.questions.length ?? 0
			  : view === "theory" || view === "podcast"
			    ? theorySet?.chapters?.filter((c) => c.content).length ?? 0
			    : 0

	const currentIndex =
		view === "flashcards"
			? flashcardIndex
			: view === "quiz"
			  ? currentQuestionIndex
			  : theoryChapterIndex

	const totalItems =
		view === "flashcards"
			? flashcardSet?.cards.length ?? 0
			: view === "quiz"
			  ? quizSet?.questions.length ?? 0
			  : theorySet?.outline?.length ?? 0

	const hasContent = totalItems > 0

	const handleNext = () => {
		if (currentIndex < totalItems - 1) {
			if (view === "flashcards") onFlashcardIndexChange(flashcardIndex + 1)
			else if (view === "quiz")
				onCurrentQuestionIndexChange(currentQuestionIndex + 1)
			else onTheoryChapterIndexChange(theoryChapterIndex + 1)
		}
	}

	const handlePrev = () => {
		if (currentIndex > 0) {
			if (view === "flashcards") onFlashcardIndexChange(flashcardIndex - 1)
			else if (view === "quiz")
				onCurrentQuestionIndexChange(currentQuestionIndex - 1)
			else onTheoryChapterIndexChange(theoryChapterIndex - 1)
		}
	}

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
		(view === "theory" || view === "podcast")

	const isSummaryActive =
		shouldShowQuizSummary ||
		shouldShowFlashcardSummary ||
		shouldShowTheorySummary
	const isNavDisabled = isSummaryActive

	const handleToggleUnderstood = () => {
		if (view === "flashcards") {
			if (!flashcardState || !flashcardSet) return
			const newUnderstoodIndices = [...flashcardState.understoodIndices]
			const indexPosition = newUnderstoodIndices.indexOf(flashcardIndex)
			if (indexPosition > -1) newUnderstoodIndices.splice(indexPosition, 1)
			else newUnderstoodIndices.push(flashcardIndex)
			onFlashcardStateChange({ understoodIndices: newUnderstoodIndices })
		} else if (view === "theory" || view === "podcast") {
			if (!theoryState || !theorySet) return
			const newUnderstoodIndices = [...theoryState.understoodIndices]
			const indexPosition = newUnderstoodIndices.indexOf(theoryChapterIndex)
			if (indexPosition > -1) newUnderstoodIndices.splice(indexPosition, 1)
			else newUnderstoodIndices.push(theoryChapterIndex)
			onTheoryStateChange({ understoodIndices: newUnderstoodIndices })
		}
	}

	const isCurrentItemUnderstood = useMemo(() => {
		if (view === "flashcards") {
			if (!flashcardState || !flashcardSet) return false
			return flashcardState.understoodIndices.includes(flashcardIndex)
		}
		if (view === "theory" || view === "podcast") {
			if (!theoryState || !theorySet) return false
			return theoryState.understoodIndices.includes(theoryChapterIndex)
		}
		return false
	}, [flashcardState, flashcardIndex, theoryState, theoryChapterIndex, view])

	const learnSettingsProps = {
		onSettingsChange: onSettingsSave,
		onGenerate: onGenerate,
		onClearLearningData: handleClearLearningData,
		isLoading: isLoading,
		topic: topic,
		language: language,
		model: model,
		onModelChange: onModelChange,
		onApiKeysChange: onApiKeysChange,
		onResetOnboarding: handleResetOnboarding,
		apiKeys: apiKeys,
		theorySet: theorySet,
		flashcardSet: flashcardSet,
		quizSet: quizSet,
	}

	const voiceChatProps = {
		apiKeys: apiKeys,
		apiKeyIndex: apiKeyIndex,
		onApiKeyIndexChange: handleApiKeyIndexChange,
	}

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
					/>
				)
			case "podcast":
				return (
					<Podcast
						theorySet={theorySet}
						topic={topic}
						chapterIndex={theoryChapterIndex}
						isCurrentUnderstood={isCurrentItemUnderstood}
						onGeneratePodcast={handleGeneratePodcastForChapter}
						isGenerating={isGeneratingPodcast}
					/>
				)
			default:
				return (
					<Theory
						theorySet={theorySet}
						topic={topic}
						chapterIndex={theoryChapterIndex}
						isCurrentUnderstood={isCurrentItemUnderstood}
					/>
				)
		}
	}

	return (
		<div className="w-full h-full relative">
			<div className="h-full w-full overflow-y-auto pb-20">{renderContent()}</div>

			{/* Sticky Toolbar */}
			<div className="absolute bottom-0 left-0 right-0 flex justify-center pb-2">
				<div className="flex flex-wrap items-center justify-center gap-2 bg-background/30 backdrop-blur-sm p-2 rounded-md w-full max-w-3xl">
					<Select
						value={view}
						onValueChange={(value) => onViewChange(value as any)}
					>
						<SelectTrigger className="w-[150px]">
							<SelectValue placeholder="Chọn chế độ" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="theory">Lý thuyết</SelectItem>
							<SelectItem value="podcast">Podcast</SelectItem>
							<SelectItem value="flashcards">Flashcard</SelectItem>
							<SelectItem value="quiz">Trắc nghiệm</SelectItem>
						</SelectContent>
					</Select>

					<div className="flex items-center gap-2">
						<Button
							onClick={handlePrev}
							disabled={currentIndex === 0 || !hasContent || isNavDisabled}
							variant="outline"
							size="icon"
							className="h-9 w-9"
						>
							<ChevronLeft className="h-4 w-4" />
						</Button>

						<span className="text-sm text-muted-foreground w-24 text-center">
							{view === "flashcards"
								? "Thẻ"
								: view === "quiz"
								  ? "Câu hỏi"
								  : "Chương"}{" "}
							{hasContent ? currentIndex + 1 : 0} / {totalItems}
						</span>

						<Button
							onClick={handleNext}
							disabled={
								!hasContent || currentIndex >= totalItems - 1 || isNavDisabled
							}
							variant="outline"
							size="icon"
							className="h-9 w-9"
						>
							<ChevronRight className="h-4 w-4" />
						</Button>

						{(view === "flashcards" ||
							view === "theory" ||
							view === "podcast") && (
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
									onClick={() => {
										if (view === "flashcards") setShowFlashcardSummary(true)
										else setShowTheorySummary(true)
									}}
									disabled={!hasContent || isSummaryActive}
									variant="outline"
									size="icon"
									className="h-9 w-9"
								>
									<Award className="w-4 h-4" />
								</Button>
							</>
						)}

						{view === "quiz" && (
							<Button
								onClick={() => setShowQuizSummary(true)}
								disabled={!hasContent || isSummaryActive}
								variant="outline"
								size="icon"
								className="h-9 w-9"
							>
								<Award className="h-4 w-4" />
							</Button>
						)}

						<Settings {...learnSettingsProps} scope="learn" />

						{visibility.advancedVoiceChat && (
							<AdvancedVoiceChat {...voiceChatProps} />
						)}
					</div>
				</div>
			</div>
		</div>
	)
}
