

"use client"

import React, { useRef } from "react"
import { AppProvider, useAppContext } from "@/contexts/AppContext"
import LeftColumn from "@/components/LeftColumn"
import RightColumn from "@/components/RightColumn"
import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "@/components/ui/resizable"
import type { ImperativePanelGroupHandle } from "react-resizable-panels"
import { Settings } from "@/components/Settings"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
	PanelLeftOpen,
	PanelRightOpen,
	ChevronLeft,
	ChevronRight,
	Award,
	CheckCircle,
} from "lucide-react"
import type { ComponentVisibility } from "@/contexts/AppContext"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { AdvancedVoiceChat } from "@/components/AdvancedVoiceChat"
import { Toolbar } from "@/components/Toolbar"

function HomePageContent() {
	const {
		isMounted,
		backgroundImage,
		visibility,
		onVisibilityChange,
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
		onClearAllData,
		onBackgroundChange,
		uploadedBackgrounds,
		onUploadedBackgroundsChange,
		registerToolbarItem,
		unregisterToolbarItem,
	} = useAppContext()

	const panelGroupRef = useRef<ImperativePanelGroupHandle>(null)

	const handleOpenLeft = () => {
		const panelGroup = panelGroupRef.current
		if (panelGroup) {
			const layout = panelGroup.getLayout()
			// If right is closed, open both to 50/50. Otherwise, open left to 45.
			if (layout[1] === 0) {
				panelGroup.setLayout([50, 50])
			} else {
				panelGroup.setLayout([45, layout[1]])
			}
		}
	}

	const handleOpenRight = () => {
		const panelGroup = panelGroupRef.current
		if (panelGroup) {
			const layout = panelGroup.getLayout()
			// If left is closed, open both to 50/50. Otherwise, open right to 55.
			if (layout[0] === 0) {
				panelGroup.setLayout([50, 50])
			} else {
				panelGroup.setLayout([layout[0], 55])
			}
		}
	}

	const handleToggleUnderstood = () => {
		if (view === "flashcards") {
			if (!flashcardState || !flashcardSet) return
			const newUnderstoodIndices = [...flashcardState.understoodIndices]
			const indexPosition = newUnderstoodIndices.indexOf(flashcardIndex)
			if (indexPosition > -1)
				newUnderstoodIndices.splice(indexPosition, 1)
			else newUnderstoodIndices.push(flashcardIndex)
			onFlashcardStateChange({ understoodIndices: newUnderstoodIndices })
		} else if (view === "theory") {
			if (!theoryState || !theorySet) return
			const newUnderstoodIndices = [...theoryState.understoodIndices]
			const indexPosition =
				newUnderstoodIndices.indexOf(theoryChapterIndex)
			if (indexPosition > -1)
				newUnderstoodIndices.splice(indexPosition, 1)
			else newUnderstoodIndices.push(theoryChapterIndex)
			onTheoryStateChange({ understoodIndices: newUnderstoodIndices })
		}
	}

	const isCurrentItemUnderstood = React.useMemo(() => {
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

	const currentCount =
		view === "flashcards"
			? flashcardSet?.cards.length ?? 0
			: view === "quiz"
			  ? quizSet?.questions.length ?? 0
			  : view === "theory"
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
				onCurrentQuestionIndexChange(currentQuestionIndex + 1)
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

	const allQuestionsAnswered = quizSet && unansweredQuestions === 0
	const shouldShowQuizSummary =
		(showQuizSummary || allQuestionsAnswered) && view === "quiz"

	const { understoodCount: flashcardUnderstood } = React.useMemo(() => {
		if (!flashcardSet || !flashcardState) {
			return {
				understoodCount: 0,
				notUnderstoodCount: flashcardSet?.cards.length ?? 0,
			}
		}
		const understood = flashcardState.understoodIndices.length
		return {
			understoodCount: understood,
			notUnderstoodCount:
				(flashcardSet.cards.length ?? 0) - understood,
		}
	}, [flashcardSet, flashcardState])

	const allFlashcardsMarked =
		flashcardSet && flashcardUnderstood === flashcardSet.cards.length
	const shouldShowFlashcardSummary =
		(showFlashcardSummary || allFlashcardsMarked) && view === "flashcards"

	const allTheoryChaptersMarked =
		theorySet &&
		theoryState &&
		theoryState.understoodIndices.length === theorySet.chapters.length
	const shouldShowTheorySummary =
		(showTheorySummary || allTheoryChaptersMarked) && view === "theory"

	const isSummaryActive =
		shouldShowQuizSummary ||
		shouldShowFlashcardSummary ||
		shouldShowTheorySummary
	const isNavDisabled = isSummaryActive

	React.useEffect(() => {
		const items = [
			{
				id: "open-left",
				component: !visibility.home && (
					<Button
						variant="outline"
						size="icon"
						className="h-9 w-9"
						onClick={handleOpenLeft}
					>
						<PanelLeftOpen className="h-4 w-4" />
					</Button>
				),
				area: "left",
				order: 1,
			},
			{
				id: "mode-selector",
				component: (
					<Select
						value={view}
						onValueChange={(value) => onViewChange(value as any)}
					>
						<SelectTrigger className="w-[150px]">
							<SelectValue placeholder="Chọn chế độ" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="theory">Lý thuyết</SelectItem>
							<SelectItem value="flashcards">
								Flashcard
							</SelectItem>
							<SelectItem value="quiz">Trắc nghiệm</SelectItem>
						</SelectContent>
					</Select>
				),
				area: "center",
				order: 1,
			},
			{
				id: "prev-button",
				component: (
					<Button
						onClick={handlePrev}
						disabled={
							currentIndex === 0 || !hasContent || isNavDisabled
						}
						variant="outline"
						size="icon"
						className="h-9 w-9"
					>
						<ChevronLeft className="h-4 w-4" />
					</Button>
				),
				area: "center",
				order: 2,
			},
			{
				id: "item-counter",
				component: (
					<span className="text-sm text-muted-foreground w-24 text-center">
						{view === "flashcards"
							? "Thẻ"
							: view === "quiz"
							  ? "Câu hỏi"
							  : "Chương"}{" "}
						{hasContent ? currentIndex + 1 : 0} / {totalItems}
					</span>
				),
				area: "center",
				order: 3,
			},
			{
				id: "next-button",
				component: (
					<Button
						onClick={handleNext}
						disabled={
							!hasContent ||
							currentIndex >= totalItems - 1 ||
							isNavDisabled
						}
						variant="outline"
						size="icon"
						className="h-9 w-9"
					>
						<ChevronRight className="h-4 w-4" />
					</Button>
				),
				area: "center",
				order: 4,
			},
			{
				id: "understood-button",
				component: (view === "flashcards" || view === "theory") && (
					<Button
						onClick={handleToggleUnderstood}
						disabled={!hasContent || isSummaryActive}
						variant={
							isCurrentItemUnderstood ? "default" : "outline"
						}
						size="icon"
						className="h-9 w-9"
					>
						<CheckCircle className="w-4 h-4" />
					</Button>
				),
				area: "center",
				order: 5,
			},
			{
				id: "summary-button",
				component: (view === "flashcards" || view === "theory") && (
					<Button
						onClick={() => {
							if (view === "flashcards")
								setShowFlashcardSummary(true)
							else setShowTheorySummary(true)
						}}
						disabled={!hasContent || isSummaryActive}
						variant="outline"
						size="icon"
						className="h-9 w-9"
					>
						<Award className="w-4 h-4" />
					</Button>
				),
				area: "center",
				order: 6,
			},
			{
				id: "quiz-summary-button",
				component: view === "quiz" && (
					<Button
						onClick={() => setShowQuizSummary(true)}
						disabled={!hasContent || isSummaryActive}
						variant="outline"
						size="icon"
						className="h-9 w-9"
					>
						<Award className="h-4 w-4" />
					</Button>
				),
				area: "center",
				order: 7,
			},
			{
				id: "open-right",
				component: !visibility.learn && (
					<Button
						variant="outline"
						size="icon"
						className="h-9 w-9"
						onClick={handleOpenRight}
					>
						<PanelRightOpen className="h-4 w-4" />
					</Button>
				),
				area: "right",
				order: 1,
			},
		]

		items.forEach((item) => {
			if (item.component) {
				registerToolbarItem(item)
			}
		})

		return () => {
			items.forEach((item) => unregisterToolbarItem(item.id))
		}
	}, [
		visibility,
		view,
		currentIndex,
		totalItems,
		hasContent,
		isNavDisabled,
		isCurrentItemUnderstood,
		isSummaryActive,
		handleOpenLeft,
		handleOpenRight,
		handlePrev,
		handleNext,
		handleToggleUnderstood,
		setShowFlashcardSummary,
		setShowTheorySummary,
		setShowQuizSummary,
		registerToolbarItem,
		unregisterToolbarItem,
	])

	if (!isMounted) {
		return null
	}

	const settingsProps = {
		onClearAllData,
		onVisibilityChange,
		onBackgroundChange,
		onUploadedBackgroundsChange,
		visibility,
		uploadedBackgrounds,
		currentBackgroundImage: backgroundImage,
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

	return (
		<main className="relative min-h-screen w-full flex flex-col">
			{backgroundImage && (
				<div
					className="absolute inset-0 bg-cover bg-center -z-10"
					style={{ backgroundImage: `url(${backgroundImage})` }}
				>
					<div className="absolute inset-0 bg-black/60"></div>
				</div>
			)}
			
			<div className="flex-grow">
				<ResizablePanelGroup 
					ref={panelGroupRef}
					direction="horizontal" 
					className="relative min-h-full w-full"
					autoSaveId="newtab-ai-layout-v2"
					onLayout={(sizes: number[]) => {
						const newVisibility = {
							...visibility,
							home: sizes[0] > 0,
							learn: sizes[1] > 0,
						};
						if (JSON.stringify(newVisibility) !== JSON.stringify(visibility)) {
							onVisibilityChange(newVisibility);
						}
					}}
				>
					<ResizablePanel 
						collapsible={true}
						collapsedSize={0}
						minSize={30}
						className={cn(!visibility.home && "min-w-0")}
					>
						<LeftColumn />
					</ResizablePanel>

					<ResizableHandle className="bg-transparent" />
					
					<ResizablePanel 
						collapsible={true}
						collapsedSize={0}
						minSize={30}
						className={cn(!visibility.learn && "min-w-0")}
					>
						<RightColumn />
					</ResizablePanel>
				</ResizablePanelGroup>
			</div>
			
			{/* Unified Toolbar */}
			<Toolbar />
		</main>
	)
}

export default function Home() {
	return (
		<AppProvider>
			<HomePageContent />
		</AppProvider>
	)
}
