
"use client"

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { Greeting } from "@/components/Greeting"
import { Search } from "@/components/Search"
import { QuickLinks } from "@/components/QuickLinks"
import { Clock } from "@/components/Clock"
import { Flashcards } from "@/components/Flashcards"
import type { FlashcardSet } from "@/ai/schemas"
import { Quiz } from "@/components/Quiz"
import type { QuizSet, QuizQuestion } from "@/ai/schemas"
import type { QuizState, FlashcardState } from "@/app/types"
import { useToast, clearAllToastTimeouts } from "@/hooks/use-toast"
import { generateFlashcards } from "@/ai/flows/generate-flashcards"
import { generateQuiz } from "@/ai/flows/generate-quiz"
import { Loader, Plus, ChevronLeft, ChevronRight, Award, Settings as SettingsIcon, CheckCircle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Settings } from "@/components/Settings"
import {
	getDb,
	LabeledData,
	AppData,
	DataKey,
	initBroadcastChannel,
	broadcastDataChange,
	onDataChange,
	closeBroadcastChannel,
	closeDb,
	clearAllData,
} from "@/lib/idb"
import type { Flashcard } from "@/ai/schemas"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AIOperationError, safeAICall } from "@/lib/ai-utils"
import { QuizSummary } from "@/components/QuizSummary"
import { FlashcardSummary } from "@/components/FlashcardSummary"

const BATCH_SIZE = 5;

interface LearnProps {
	view: "flashcards" | "quiz"
	isLoading: boolean
	flashcardSet: FlashcardSet | null
	quizSet: QuizSet | null
	quizState: QuizState | null
	onGenerateNew: () => void
	onQuizStateChange: (newState: QuizState) => void
	onQuizReset: () => void;
	canGenerateMore: boolean
	onFlashcardIndexChange: (index: number) => void
	flashcardIndex: number
	onViewChange: (view: "flashcards" | "quiz") => void
	language: string
	topic: string
	showQuizSummary: boolean
	setShowQuizSummary: (show: boolean) => void;
	showFlashcardSummary: boolean;
	setShowFlashcardSummary: (show: boolean) => void;
	flashcardState: FlashcardState | null;
	onFlashcardStateChange: (newState: FlashcardState) => void;
	onFlashcardReset: () => void;
	settingsProps: any;
	currentQuestionIndex: number;
	onCurrentQuestionIndexChange: (index: number) => void;
}

function Learn({
	view,
	isLoading,
	flashcardSet,
	quizSet,
	quizState,
	onGenerateNew,
	onQuizStateChange,
	onQuizReset,
	canGenerateMore,
	flashcardIndex,
	onFlashcardIndexChange,
	onViewChange,
	language,
	topic,
	showQuizSummary,
	setShowQuizSummary,
	showFlashcardSummary,
	setShowFlashcardSummary,
	flashcardState,
	onFlashcardStateChange,
	onFlashcardReset,
	settingsProps,
	currentQuestionIndex,
	onCurrentQuestionIndexChange
}: LearnProps) {
	const currentCount = view === "flashcards" ? flashcardSet?.cards.length ?? 0 : quizSet?.questions.length ?? 0;
	const currentIndex = view === "flashcards" ? flashcardIndex : currentQuestionIndex;
	const totalItems = view === "flashcards" ? flashcardSet?.cards.length ?? 0 : quizSet?.questions.length ?? 0;
	const hasContent = totalItems > 0;

	const handleNext = () => {
		if (view === 'flashcards') {
			if (flashcardIndex < totalItems - 1) onFlashcardIndexChange(flashcardIndex + 1);
		} else if (quizSet && quizState) {
			if (currentQuestionIndex < totalItems - 1) {
				onCurrentQuestionIndexChange(currentQuestionIndex + 1);
			}
		}
	};
	
	const handlePrev = () => {
		if (view === 'flashcards') {
			if (flashcardIndex > 0) onFlashcardIndexChange(flashcardIndex - 1);
		} else if (quizSet && quizState) {
			if (currentQuestionIndex > 0) {
				onCurrentQuestionIndexChange(currentQuestionIndex - 1);
			}
		}
	};

	const { correctAnswers, incorrectAnswers, unansweredQuestions } = React.useMemo(() => {
		if (!quizSet || !quizState) {
			return { correctAnswers: 0, incorrectAnswers: 0, unansweredQuestions: quizSet?.questions.length ?? 0 };
		}
	
		let correct = 0;
		const answeredIndices = Object.keys(quizState.answers).map(Number);
	
		for (const index of answeredIndices) {
			const question = quizSet.questions[index];
			const answer = quizState.answers[index];
			if (question && answer && answer.selected === question.answer) {
				correct++;
			}
		}
		
		const answeredCount = answeredIndices.length;
		const incorrect = answeredCount - correct;
		const unanswered = quizSet.questions.length - answeredCount;
	
		return { correctAnswers: correct, incorrectAnswers: incorrect, unansweredQuestions: unanswered };
	}, [quizSet, quizState]);

	const { understoodCount, notUnderstoodCount } = React.useMemo(() => {
		if (!flashcardSet || !flashcardState) {
			return { understoodCount: 0, notUnderstoodCount: flashcardSet?.cards.length ?? 0 };
		}
		const understood = flashcardState.understoodIndices.length;
		const total = flashcardSet.cards.length;
		return { understoodCount: understood, notUnderstoodCount: total - understood };
	}, [flashcardSet, flashcardState]);

	const allQuestionsAnswered = quizSet && (unansweredQuestions === 0);
	const shouldShowQuizSummary = (showQuizSummary || allQuestionsAnswered) && view === 'quiz';

	const allFlashcardsMarked = flashcardSet && (understoodCount === flashcardSet.cards.length);
    const shouldShowFlashcardSummary = (showFlashcardSummary || allFlashcardsMarked) && view === 'flashcards';

	const isSummaryActive = shouldShowQuizSummary || shouldShowFlashcardSummary;

	const handleToggleUnderstood = () => {
		if (!flashcardState || !flashcardSet) return;
		const currentCard = flashcardSet.cards[flashcardIndex];
		if(!currentCard) return;

		const originalIndex = flashcardIndex; // Index is now stable
		
		const newUnderstoodIndices = [...flashcardState.understoodIndices];
		const indexPosition = newUnderstoodIndices.indexOf(originalIndex);

		if (indexPosition > -1) {
			newUnderstoodIndices.splice(indexPosition, 1); // Unmark
		} else {
			newUnderstoodIndices.push(originalIndex); // Mark
		}
		onFlashcardStateChange({ understoodIndices: newUnderstoodIndices });
	};

	const isCurrentCardUnderstood = useMemo(() => {
		if (!flashcardState || !flashcardSet) return false;
		return flashcardState.understoodIndices.includes(flashcardIndex);
	}, [flashcardState, flashcardIndex]);


	return (
		<Card className="w-full h-full bg-transparent shadow-none border-none p-0 flex flex-col">
			<CardContent className="flex-grow flex flex-col p-0">
				{shouldShowQuizSummary && quizSet ? (
					<QuizSummary
						correctAnswers={correctAnswers}
						incorrectAnswers={incorrectAnswers}
						unansweredQuestions={unansweredQuestions}
						totalQuestions={quizSet.questions.length}
						onReset={onQuizReset}
						onBack={() => setShowQuizSummary(false)}
						isCompleted={allQuestionsAnswered}
					/>
				) : shouldShowFlashcardSummary && flashcardSet ? (
					<FlashcardSummary
						understoodCount={understoodCount}
						notUnderstoodCount={notUnderstoodCount}
						totalCards={flashcardSet.cards.length}
						onReset={onFlashcardReset}
						onBack={() => setShowFlashcardSummary(false)}
						isCompleted={allFlashcardsMarked}
					/>
				) : view === "flashcards" ? (
					<Flashcards
						flashcardSet={flashcardSet}
						flashcardIndex={flashcardIndex}
						topic={topic}
						isCurrentUnderstood={isCurrentCardUnderstood}
					/>
				) : (
					<Quiz
						quizSet={quizSet}
						quizState={quizState}
						onQuizStateChange={onQuizStateChange}
						language={language}
						topic={topic}
						currentQuestionIndex={currentQuestionIndex}
						onCurrentQuestionIndexChange={onCurrentQuestionIndexChange}
					/>
				)}
			</CardContent>

			{/* Unified Toolbar */}
			<div className="flex justify-center pb-2">
				<div className="inline-flex items-center justify-center bg-background/30 backdrop-blur-sm p-2 rounded-md w-full max-w-lg">
					<div className="flex items-center justify-between w-full gap-2">
						<Tabs
							value={view}
							onValueChange={(value) => onViewChange(value as "flashcards" | "quiz")}
							className="w-auto"
						>
							<TabsList>
								<TabsTrigger value="flashcards">Flashcard</TabsTrigger>
								<TabsTrigger value="quiz">Trắc nghiệm</TabsTrigger>
							</TabsList>
						</Tabs>

						<div className="flex items-center gap-2">
							<Button
								onClick={handlePrev}
								disabled={currentIndex === 0 || !hasContent || isSummaryActive}
								variant="outline"
								size="icon"
								className="h-9 w-9"
							>
								<ChevronLeft className="h-4 w-4" />
							</Button>

							<span className="text-sm text-muted-foreground w-24 text-center">
								{view === "flashcards" ? "Thẻ" : "Câu hỏi"} {hasContent ? currentIndex + 1 : 0} / {totalItems}
							</span>

							<Button
								onClick={handleNext}
								disabled={!hasContent || currentIndex >= totalItems - 1 || isSummaryActive}
								variant="outline"
								size="icon"
								className="h-9 w-9"
							>
								<ChevronRight className="h-4 w-4" />
							</Button>
							
							{view === 'flashcards' && (
								<>
									<Button
										onClick={handleToggleUnderstood}
										disabled={!hasContent || isSummaryActive}
										variant={isCurrentCardUnderstood ? "default" : "outline"}
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
							)}


							{view === 'quiz' && (
								<Button
									onClick={() => setShowQuizSummary(true)}
									disabled={!hasContent || isSummaryActive}
									variant="outline"
									size="icon"
									className="h-9 w-9"
								>
									<Award className="w-4 h-4" />
								</Button>
							)}

							<Button
								onClick={onGenerateNew}
								disabled={isLoading || !canGenerateMore || isSummaryActive}
								variant="outline"
								size="icon"
								className="h-9 w-9"
							>
								{isLoading ? (
									<Loader className="animate-spin w-4 h-4" />
								) : (
									<Plus className="w-4 h-4" />
								)}
							</Button>
							
							<Settings {...settingsProps} scope="learn" />

						</div>
					</div>
				</div>
			</div>
		</Card>
	)
}

export interface ComponentVisibility {
	clock: boolean
	greeting: boolean
	search: boolean
	quickLinks: boolean
	learn: boolean
}

export default function Home() {
	const [view, setView] = useState<"flashcards" | "quiz">("flashcards")
	const [topic, setTopic] = useState("")
	const [language, setLanguage] = useState("English")
	const [flashcardMax, setFlashcardMax] = useState(50)
	const [quizMax, setQuizMax] = useState(50)
	const [isFlashcardLoading, setIsFlashcardLoading] = useState(false)
	const [isQuizLoading, setIsQuizLoading] = useState(false)
	const [flashcardSet, setFlashcardSet] = useState<FlashcardSet | null>(null)
	const [quizSet, setQuizSet] = useState<QuizSet | null>(null)
	const [quizState, setQuizState] = useState<QuizState | null>(null)
	const [flashcardState, setFlashcardState] = useState<FlashcardState | null>(null)
	const { toast } = useToast()
	const [visibility, setVisibility] = useState<ComponentVisibility>({
		clock: true,
		greeting: true,
		search: true,
		quickLinks: true,
		learn: true,
	})
	const [backgroundImage, setBackgroundImage] = useState("")
	const [uploadedBackgrounds, setUploadedBackgrounds] = useState<string[]>([])
	const [isMounted, setIsMounted] = useState(false)
	
	const [flashcardIndex, setFlashcardIndex] = useState(0)
	const [showQuizSummary, setShowQuizSummary] = useState(false);
	const [showFlashcardSummary, setShowFlashcardSummary] = useState(false);
	const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

	// Prevent race conditions and cleanup async operations
	const isFlashcardGeneratingRef = useRef(false)
	const isQuizGeneratingRef = useRef(false)
	const abortControllerRef = useRef<AbortController | null>(null)
	const isMountedRef = useRef(true)

	// Initialize once
	useEffect(() => {
		initBroadcastChannel();
		console.log("Tab is running independently, no data sync.");

		return () => {
			isMountedRef.current = false;
			closeBroadcastChannel();
			closeDb();
			clearAllToastTimeouts();

			if (abortControllerRef.current) {
				abortControllerRef.current.abort();
			}
		}
	}, []);

	useEffect(() => {
		setIsMounted(true)
	}, [])

	const handleGenerate = useCallback(
		async (
			currentTopic: string,
			currentLanguage: string,
			forceNew: boolean = false,
			genType: "flashcards" | "quiz"
		) => {
			if (!currentTopic.trim()) {
				toast({
					title: "Chủ đề trống",
					description: "Vui lòng nhập một chủ đề để bắt đầu tạo.",
					variant: "destructive",
				})
				return
			}
			
			const isGeneratingRef = genType === 'flashcards' ? isFlashcardGeneratingRef : isQuizGeneratingRef;
			const setIsLoading = genType === 'flashcards' ? setIsFlashcardLoading : setIsQuizLoading;

			if (isGeneratingRef.current) {
				toast({
					title: "Đang tạo...",
					description: `Một quá trình tạo ${genType === 'flashcards' ? 'flashcard' : 'quiz'} khác đang chạy.`,
				})
				return
			}

			isGeneratingRef.current = true
			setIsLoading(true)

			if (abortControllerRef.current) {
				abortControllerRef.current.abort()
			}
			abortControllerRef.current = new AbortController()
			const signal = abortControllerRef.current.signal

			const db = await getDb()

			try {
				if (genType === "flashcards") {
					if (forceNew) {
						setFlashcardSet(null)
						setFlashcardIndex(0)
						setFlashcardState(null)
						setShowFlashcardSummary(false);
						await db.delete("data", "flashcards")
						await db.delete("data", "flashcardIndex")
						await db.delete("data", "flashcardState")
					}

					const flashcardData = (await db.get(
						"data",
						"flashcards"
					)) as LabeledData<FlashcardSet>
					const currentFlashcards =
						!forceNew && flashcardData && flashcardData.topic === currentTopic
							? flashcardData.data
							: { id: "idb-flashcards", topic: currentTopic, cards: [] }

					if (isMountedRef.current && forceNew) {
						setFlashcardSet({ ...currentFlashcards })
						setFlashcardState({ understoodIndices: [] })
					}

					let flashcardsNeeded = flashcardMax - currentFlashcards.cards.length
					if (flashcardsNeeded <= 0) {
						setIsLoading(false)
						isGeneratingRef.current = false
						return
					}


					while (flashcardsNeeded > 0 && !signal.aborted) {
						const count = Math.min(BATCH_SIZE, flashcardsNeeded)
						const newCards = await safeAICall(() =>
							generateFlashcards({
								topic: currentTopic,
								count,
								language: currentLanguage,
								existingCards: currentFlashcards.cards,
							}), { signal }
						)

						if (
							Array.isArray(newCards) &&
							newCards.length > 0 &&
							!signal.aborted &&
							isMountedRef.current
						) {
							currentFlashcards.cards.push(...newCards)
							flashcardsNeeded -= newCards.length
							setFlashcardSet({ ...currentFlashcards }) 
							await db.put("data", {
								id: "flashcards",
								topic: currentTopic,
								data: currentFlashcards,
							} as any)
						} else {
							flashcardsNeeded = 0;
						}
						if(flashcardsNeeded > 0) await new Promise((resolve) => setTimeout(resolve, 1000));
					}
				}

				if (genType === "quiz") {
					if (forceNew) {
						setQuizSet(null)
						setQuizState(null)
						setCurrentQuestionIndex(0);
						setShowQuizSummary(false);
						await db.delete("data", "quiz")
						await db.delete("data", "quizState")
					}

					const quizData = (await db.get(
						"data",
						"quiz"
					)) as LabeledData<QuizSet>
					const currentQuiz =
						!forceNew && quizData && quizData.topic === currentTopic
							? quizData.data
							: { id: "idb-quiz", topic: currentTopic, questions: [] }

					if (isMountedRef.current && forceNew) {
						setQuizSet({ ...currentQuiz })
						setQuizState({ currentQuestionIndex: 0, answers: {} });
					}

					let quizNeeded = quizMax - currentQuiz.questions.length
					if (quizNeeded <= 0) {
						setIsLoading(false)
						isGeneratingRef.current = false
						return
					}

					while (quizNeeded > 0 && !signal.aborted) {
						const count = Math.min(BATCH_SIZE, quizNeeded)
						const newQuestions = await safeAICall(() =>
							generateQuiz({
								topic: currentTopic,
								count,
								language: currentLanguage,
								existingQuestions: currentQuiz.questions,
							}), { signal }
						)

						if (
							Array.isArray(newQuestions) &&
							newQuestions.length > 0 &&
							!signal.aborted &&
							isMountedRef.current
						) {
							currentQuiz.questions.push(...newQuestions)
							quizNeeded -= newQuestions.length
							setQuizSet({ ...currentQuiz })
							await db.put("data", {
								id: "quiz",
								topic: currentTopic,
								data: currentQuiz,
							} as any)
						} else {
							quizNeeded = 0;
						}
						if(quizNeeded > 0) await new Promise((resolve) => setTimeout(resolve, 1000));
					}
				}

			} catch (error: any) {
				console.error(`🚫 ${genType} generation bị hủy hoặc lỗi:`, error.message)
				if (error instanceof AIOperationError && error.code === "ABORTED") {
					toast({
						title: "Đã hủy",
						description: `Quá trình tạo ${genType} đã được hủy.`,
					});
				} else {
					toast({
						title: "Lỗi tạo nội dung",
						description: `Không thể tạo ${genType}: ${error.message}. Vui lòng thử lại.`,
						variant: "destructive",
					})
				}
			} finally {
				isGeneratingRef.current = false
				if (isMountedRef.current) {
					setIsLoading(false)
				}
			}
		},
		[toast, flashcardMax, quizMax]
	)
	
	const loadInitialData = useCallback(async () => {
		const db = await getDb()

		const [
			savedViewRes,
			savedTopicRes,
			savedLanguageRes,
			savedFlashcardMaxRes,
			savedQuizMaxRes,
			savedVisibilityRes,
			savedBgRes,
			savedUploadedBgsRes,
			flashcardDataRes,
			flashcardStateRes,
			quizDataRes,
			quizStateRes,
		] = await Promise.all([
			db.get("data", "view"),
			db.get("data", "topic"),
			db.get("data", "language"),
			db.get("data", "flashcardMax"),
			db.get("data", "quizMax"),
			db.get("data", "visibility"),
			db.get("data", "background"),
			db.get("data", "uploadedBackgrounds"),
			db.get("data", "flashcards"),
			db.get("data", "flashcardState"),
			db.get("data", "quiz"),
			db.get("data", "quizState"),
		]);
	
		const savedView = (savedViewRes?.data as "flashcards" | "quiz") || "flashcards";
		const savedTopic = (savedTopicRes?.data as string) || "Lịch sử La Mã";
		const savedLanguage = (savedLanguageRes?.data as string) || "Vietnamese";
		const savedFlashcardMax = (savedFlashcardMaxRes?.data as number) || 50;
		const savedQuizMax = (savedQuizMaxRes?.data as number) || 50;
		
		const savedVisibility = savedVisibilityRes?.data as ComponentVisibility;
		const savedBg = savedBgRes?.data as string;
		const savedUploadedBgs = (savedUploadedBgsRes?.data as string[]) || [];
		
		const flashcardData = flashcardDataRes as LabeledData<FlashcardSet>;
		const flashcardStateData = flashcardStateRes as AppData;
		const quizData = quizDataRes as LabeledData<QuizSet>;
		const quizStateData = quizStateRes as AppData;

		if (savedBg) setBackgroundImage(savedBg);
		setUploadedBackgrounds(savedUploadedBgs);
	
		setView(savedView);
		setTopic(savedTopic);
		setLanguage(savedLanguage);
		setFlashcardMax(savedFlashcardMax);
		setQuizMax(savedQuizMax);
		
		setVisibility(
			savedVisibility ?? {
				clock: true,
				greeting: true,
				search: true,
				quickLinks: true,
				learn: true,
			}
		);
	
		let currentFlashcards =
			flashcardData && flashcardData.topic === savedTopic
				? flashcardData.data
				: null;
		
		let currentQuiz =
			quizData && quizData.topic === savedTopic ? quizData.data : null;
	
		setFlashcardSet(currentFlashcards);
		setQuizSet(currentQuiz);
		
		const currentFlashcardState = (flashcardData && flashcardData.topic === savedTopic && flashcardStateData)
			? flashcardStateData.data as FlashcardState
			: { understoodIndices: [] };
		setFlashcardState(currentFlashcardState);
	
		let initialFlashcardIndex = 0;
		if (currentFlashcards && currentFlashcards.cards.length > 0) {
			const firstUnseenIndex = currentFlashcards.cards.findIndex(
				(_, index) => !currentFlashcardState.understoodIndices.includes(index)
			);
			if (firstUnseenIndex !== -1) {
				initialFlashcardIndex = firstUnseenIndex;
			}
		}
		setFlashcardIndex(initialFlashcardIndex);
	
		let currentQuizState: QuizState = { currentQuestionIndex: 0, answers: {} };
		if (quizData && quizData.topic === savedTopic && quizStateData) {
			currentQuizState = quizStateData.data;
		}
		
		if (currentQuiz && currentQuiz.questions.length > 0) {
			const firstUnansweredIndex = currentQuiz.questions.findIndex(
				(_, index) => !currentQuizState.answers[index]
			);
			if (firstUnansweredIndex !== -1) {
				currentQuizState.currentQuestionIndex = firstUnansweredIndex;
			}
		}
		setQuizState(currentQuizState);
		setCurrentQuestionIndex(currentQuizState.currentQuestionIndex);
	
	}, []);

	const handleClearAllData = useCallback(async () => {
		const db = await getDb()
		await clearAllData(db)
		await loadInitialData()
		toast({
			title: "Đã xóa dữ liệu",
			description: "Toàn bộ flashcard và quiz đã được xóa.",
		})
	}, [loadInitialData, toast])

	useEffect(() => {
		if (isMounted) {
			loadInitialData()
		}
	}, [isMounted, loadInitialData])

	const onSettingsSave = useCallback(
		async (settings: {
			topic: string
			language: string
			flashcardMax: number
			quizMax: number
		}) => {
			const {
				topic: newTopic,
				language: newLanguage,
				flashcardMax: newFlashcardMax,
				quizMax: newQuizMax,
			} = settings
			const db = await getDb()
			
			const topicChanged = topic !== newTopic;

			if (topicChanged) {
				setTopic(newTopic)
				await db.put("data", { id: "topic", data: newTopic })
			}
			if (language !== newLanguage) {
				setLanguage(newLanguage)
				await db.put("data", { id: "language", data: newLanguage })
			}
			if (flashcardMax !== newFlashcardMax) {
				setFlashcardMax(newFlashcardMax)
				await db.put("data", {
					id: "flashcardMax",
					data: newFlashcardMax,
				})
			}
			if (quizMax !== newQuizMax) {
				setQuizMax(newQuizMax)
				await db.put("data", { id: "quizMax", data: newQuizMax })
			}
		},
		[
			topic, 
			language, 
			flashcardMax, 
			quizMax, 
		]
	)

	const onGenerateFromSettings = useCallback(
		(newTopic: string) => {
			handleGenerate(newTopic, language, true, view);
		}, 
		[handleGenerate, language, view]
	)


	const handleBackgroundChange = useCallback(
		async (newBg: string | null) => {
			if (backgroundImage === (newBg ?? "")) return

			const db = await getDb()
			if (newBg) {
				setBackgroundImage(newBg)
				await db.put("data", { id: "background", data: newBg })
			} else {
				setBackgroundImage("")
				await db.delete("data", "background")
			}
		},
		[backgroundImage]
	)

	const handleUploadedBackgroundsChange = useCallback(
		async (newUploadedBgs: string[]) => {
			if (uploadedBackgrounds.toString() === newUploadedBgs.toString())
				return

			setUploadedBackgrounds(newUploadedBgs)
			const db = await getDb()
			await db.put("data", {
				id: "uploadedBackgrounds",
				data: newUploadedBgs,
			})
		},
		[uploadedBackgrounds]
	)

	const handleVisibilityChange = useCallback(
		async (newVisibility: ComponentVisibility) => {
			if (
				visibility.clock === newVisibility.clock &&
				visibility.greeting === newVisibility.greeting &&
				visibility.search === newVisibility.search &&
				visibility.quickLinks === newVisibility.quickLinks &&
				visibility.learn === newVisibility.learn
			)
				return

			setVisibility(newVisibility)
			const db = await getDb()
			await db.put("data", { id: "visibility", data: newVisibility })
		},
		[visibility]
	)

	const handleViewChange = useCallback(
		async (newView: "flashcards" | "quiz") => {
			if (view === newView) return
			setView(newView)
			setShowQuizSummary(false); // Hide summary when switching views
			setShowFlashcardSummary(false);
			const db = await getDb()
			await db.put("data", { id: "view", data: newView })
		},
		[view]
	)

	const handleCurrentQuestionIndexChange = useCallback((index: number) => {
        setCurrentQuestionIndex(index);
        if (quizState) {
            const newState = { ...quizState, currentQuestionIndex: index };
            setQuizState(newState);
            // Debounce or directly write to DB
            const db = getDb();
            db.then(d => d.put("data", { id: "quizState", data: newState }));
        }
    }, [quizState]);

	const handleQuizStateChange = useCallback(async (newState: QuizState) => {
		setQuizState(newState)
		const db = await getDb()
		await db.put("data", { id: "quizState", data: newState })
	}, [])

	const handleQuizReset = useCallback(async () => {
		const newQuizState: QuizState = {
			currentQuestionIndex: 0,
			answers: {},
		};
		setQuizState(newQuizState);
		setCurrentQuestionIndex(0);
		setShowQuizSummary(false);
	
		const db = await getDb();
		await db.put("data", { id: "quizState", data: newQuizState });
	
		toast({
			title: "Bắt đầu lại",
			description: "Bạn có thể bắt đầu lại bài trắc nghiệm.",
		});
	}, [toast]);

	const handleFlashcardStateChange = useCallback(async (newState: FlashcardState) => {
		setFlashcardState(newState);
		const db = await getDb();
		await db.put("data", { id: "flashcardState", data: newState });
	}, []);

	const handleFlashcardReset = useCallback(async () => {
		const newFlashcardState: FlashcardState = {
			understoodIndices: [],
		};
		setFlashcardState(newFlashcardState);
		setShowFlashcardSummary(false);
		setFlashcardIndex(0); // Go back to the first card

		const db = await getDb();
		await db.put("data", { id: "flashcardState", data: newFlashcardState });
		await db.put("data", { id: "flashcardIndex", data: 0 });


		toast({
			title: "Bắt đầu lại",
			description: "Bạn có thể bắt đầu lại bộ thẻ này.",
		});
	}, [toast]);

	const onGenerateNew = useCallback(() => {
		handleGenerate(topic, language, false, view)
	}, [handleGenerate, topic, language, view])

	const handleFlashcardIndexChange = useCallback(
		async (index: number) => {
			setFlashcardIndex(index);
			const db = await getDb();
			await db.put("data", { id: "flashcardIndex", data: index });
		},
		[] 
	);

	const isOverallLoading = isFlashcardLoading || isQuizLoading
	const currentCount =
		view === "flashcards"
			? flashcardSet?.cards.length ?? 0
			: quizSet?.questions.length ?? 0
	const targetCount = view === "flashcards" ? flashcardMax : quizMax
	const canGenerateMore =
		currentCount < targetCount &&
		(view === "flashcards" ? !isFlashcardLoading : !isQuizLoading)
	const currentViewIsLoading =
		view === "flashcards" ? isFlashcardLoading : isQuizLoading
	

	if (!isMounted) {
		return null
	}
	
	const learnSettingsProps = {
		onSettingsChange: onSettingsSave,
		onGenerateNew: onGenerateFromSettings,
		currentView: view,
		topic: topic,
		language: language,
		flashcardMax: flashcardMax,
		quizMax: quizMax,
	}

	const globalSettingsProps = {
		onClearAllData: handleClearAllData,
		onVisibilityChange: handleVisibilityChange,
		onBackgroundChange: handleBackgroundChange,
		onUploadedBackgroundsChange: handleUploadedBackgroundsChange,
		visibility: visibility,
		uploadedBackgrounds: uploadedBackgrounds,
		currentBackgroundImage: backgroundImage,
	}

	return (
		<main className="relative min-h-screen w-full lg:grid lg:grid-cols-[1.2fr,1.5fr]">
			{backgroundImage && (
				<div
					className="absolute inset-0 bg-cover bg-center"
					style={{ backgroundImage: `url(${backgroundImage})` }}
				>
					<div className="absolute inset-0 bg-black/60"></div>
				</div>
			)}

			{/* Left Column */}
			<div className="relative flex h-full flex-col justify-center p-4 sm:p-8 md:p-12">
				<div className="absolute top-4 sm:top-8 md:top-12 left-4 sm:left-8 md:left-12 right-4 sm:right-8 md:right-12 flex justify-start items-center gap-4">
					{visibility.greeting && <Greeting />}
					<Settings {...globalSettingsProps} scope="global" />
				</div>

				<div className="flex flex-col items-center justify-center space-y-8 w-full max-w-xl mx-auto">
					{visibility.clock && <Clock />}
					{visibility.search && <Search />}
					{visibility.quickLinks && <QuickLinks />}
				</div>
			</div>


			{/* Right Column */}
			{visibility.learn && (
				<div className="relative flex flex-col justify-start items-center p-4 sm:p-6 md:p-8 max-h-screen overflow-y-auto">
					<div className="flex flex-col w-full h-full">
						<Learn
							view={view}
							isLoading={currentViewIsLoading}
							flashcardSet={flashcardSet}
							quizSet={quizSet}
							quizState={quizState}
							onGenerateNew={onGenerateNew}
							onQuizStateChange={handleQuizStateChange}
							onQuizReset={handleQuizReset}
							canGenerateMore={canGenerateMore}
							flashcardIndex={flashcardIndex}
							onFlashcardIndexChange={handleFlashcardIndexChange}
							onViewChange={handleViewChange}
							language={language}
							topic={topic}
							showQuizSummary={showQuizSummary}
							setShowQuizSummary={setShowQuizSummary}
							showFlashcardSummary={showFlashcardSummary}
							setShowFlashcardSummary={setShowFlashcardSummary}
							flashcardState={flashcardState}
							onFlashcardStateChange={handleFlashcardStateChange}
							onFlashcardReset={handleFlashcardReset}
							settingsProps={learnSettingsProps}
							currentQuestionIndex={currentQuestionIndex}
							onCurrentQuestionIndexChange={handleCurrentQuestionIndexChange}
						/>
					</div>
				</div>
			)}
		</main>
	)
}
