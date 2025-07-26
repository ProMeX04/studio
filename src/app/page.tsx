
"use client"

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { Greeting } from "@/components/Greeting"
import { Search } from "@/components/Search"
import { QuickLinks } from "@/components/QuickLinks"
import { Clock } from "@/components/Clock"
import { Flashcards } from "@/components/Flashcards"
import type { CardData, CardSet, TheorySet } from "@/ai/schemas"
import { Quiz } from "@/components/Quiz"
import { Theory } from "@/components/Theory"
import type { QuizSet, QuizQuestion } from "@/ai/schemas"
import type { QuizState, FlashcardState, TheoryState } from "@/app/types"
import { useToast, clearAllToastTimeouts } from "@/hooks/use-toast"
import { generateFlashcards } from "@/ai/flows/generate-flashcards"
import { generateQuiz } from "@/ai/flows/generate-quiz"
import { generateTheoryOutline } from "@/ai/flows/generate-theory-outline"
import { generateTheoryChapter } from "@/ai/flows/generate-theory-chapter"
import { Loader, Plus, ChevronLeft, ChevronRight, Award, Settings as SettingsIcon, CheckCircle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Settings } from "@/components/Settings"
import {
	getDb,
	LabeledData,
	AppData,
	DataKey,
	closeDb,
	clearAllData,
} from "@/lib/idb"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AIOperationError, safeAICall } from "@/lib/ai-utils"
import { QuizSummary } from "@/components/QuizSummary"
import { FlashcardSummary } from "@/components/FlashcardSummary"
import { TheorySummary } from "@/components/TheorySummary"

const FLASHCARD_BATCH_SIZE = 10;
const QUIZ_BATCH_SIZE = 5;

type ViewType = "flashcards" | "quiz" | "theory";

interface LearnProps {
	view: ViewType
	isLoading: boolean
	flashcardSet: CardSet | null
	quizSet: QuizSet | null
	theorySet: TheorySet | null
	quizState: QuizState | null
	onGenerateNew: () => void
	onQuizStateChange: (newState: QuizState) => void
	onQuizReset: () => void;
	canGenerateMore: boolean
	onFlashcardIndexChange: (index: number) => void
	flashcardIndex: number
	onViewChange: (view: ViewType) => void
	language: string
	topic: string
	showQuizSummary: boolean
	setShowQuizSummary: (show: boolean) => void;
	showFlashcardSummary: boolean;
	setShowFlashcardSummary: (show: boolean) => void;
	showTheorySummary: boolean;
	setShowTheorySummary: (show: boolean) => void;
	flashcardState: FlashcardState | null;
	onFlashcardStateChange: (newState: FlashcardState) => void;
	onFlashcardReset: () => void;
	theoryState: TheoryState | null;
	onTheoryStateChange: (newState: TheoryState) => void;
	onTheoryReset: () => void;
	settingsProps: any;
	currentQuestionIndex: number;
	onCurrentQuestionIndexChange: (index: number) => void;
	theoryChapterIndex: number;
	onTheoryChapterIndexChange: (index: number) => void;
	apiKeys: string[];
	apiKeyIndex: number;
	onApiKeyIndexChange: (index: number) => void;
}

function Learn({
	view,
	isLoading,
	flashcardSet,
	quizSet,
	theorySet,
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
	showTheorySummary,
	setShowTheorySummary,
	flashcardState,
	onFlashcardStateChange,
	onFlashcardReset,
	theoryState,
	onTheoryStateChange,
	onTheoryReset,
	settingsProps,
	currentQuestionIndex,
	onCurrentQuestionIndexChange,
	theoryChapterIndex,
	onTheoryChapterIndexChange,
	apiKeys,
	apiKeyIndex,
	onApiKeyIndexChange,
}: LearnProps) {
	const currentCount = view === "flashcards" 
		? flashcardSet?.cards.length ?? 0
		: view === "quiz"
		? quizSet?.questions.length ?? 0
		: theorySet?.chapters?.filter(c => c.content).length ?? 0;
			
	const currentIndex = view === "flashcards" 
		? flashcardIndex 
		: view === "quiz"
		? currentQuestionIndex
		: theoryChapterIndex;

	const totalItems = view === "flashcards" 
		? flashcardSet?.cards.length ?? 0 
		: view === "quiz"
		? quizSet?.questions.length ?? 0
		: theorySet?.outline?.length ?? 0;

	const hasContent = totalItems > 0;

	const handleNext = () => {
		if (currentIndex < totalItems - 1) {
			if (view === 'flashcards') onFlashcardIndexChange(flashcardIndex + 1);
			else if (view === 'quiz') onCurrentQuestionIndexChange(currentQuestionIndex + 1);
			else if (view === 'theory') onTheoryChapterIndexChange(theoryChapterIndex + 1);
		}
	};
	
	const handlePrev = () => {
		if (currentIndex > 0) {
			if (view === 'flashcards') onFlashcardIndexChange(flashcardIndex - 1);
			else if (view === 'quiz') onCurrentQuestionIndexChange(currentQuestionIndex - 1);
			else if (view === 'theory') onTheoryChapterIndexChange(theoryChapterIndex - 1);
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

	const { understoodCount: flashcardUnderstood, notUnderstoodCount: flashcardNotUnderstood } = React.useMemo(() => {
		if (!flashcardSet || !flashcardState) {
			return { understoodCount: 0, notUnderstoodCount: flashcardSet?.cards.length ?? 0 };
		}
		const understood = flashcardState.understoodIndices.length;
		const total = flashcardSet.cards.length;
		return { understoodCount: understood, notUnderstoodCount: total - understood };
	}, [flashcardSet, flashcardState]);

	const { understoodCount: theoryUnderstood, notUnderstoodCount: theoryNotUnderstood } = React.useMemo(() => {
		if (!theorySet || !theoryState) {
			return { understoodCount: 0, notUnderstoodCount: theorySet?.chapters.length ?? 0 };
		}
		const understood = theoryState.understoodIndices.length;
		const total = theorySet.chapters.length;
		return { understoodCount: understood, notUnderstoodCount: total - understood };
	}, [theorySet, theoryState]);


	const allQuestionsAnswered = quizSet && (unansweredQuestions === 0);
	const shouldShowQuizSummary = (showQuizSummary || allQuestionsAnswered) && view === 'quiz';

	const allFlashcardsMarked = flashcardSet && (flashcardUnderstood === flashcardSet.cards.length);
    const shouldShowFlashcardSummary = (showFlashcardSummary || allFlashcardsMarked) && view === 'flashcards';

	const allTheoryChaptersMarked = theorySet && (theoryUnderstood === theorySet.chapters.length);
    const shouldShowTheorySummary = (showTheorySummary || allTheoryChaptersMarked) && view === 'theory';

	const isSummaryActive = shouldShowQuizSummary || shouldShowFlashcardSummary || shouldShowTheorySummary;
	const isNavDisabled = isSummaryActive;

	const handleToggleUnderstood = () => {
		if (view === 'flashcards') {
			if (!flashcardState || !flashcardSet) return;
			const newUnderstoodIndices = [...flashcardState.understoodIndices];
			const indexPosition = newUnderstoodIndices.indexOf(flashcardIndex);
			if (indexPosition > -1) newUnderstoodIndices.splice(indexPosition, 1);
			else newUnderstoodIndices.push(flashcardIndex);
			onFlashcardStateChange({ understoodIndices: newUnderstoodIndices });
		} else if (view === 'theory') {
			if (!theoryState || !theorySet) return;
			const newUnderstoodIndices = [...theoryState.understoodIndices];
			const indexPosition = newUnderstoodIndices.indexOf(theoryChapterIndex);
			if (indexPosition > -1) newUnderstoodIndices.splice(indexPosition, 1);
			else newUnderstoodIndices.push(theoryChapterIndex);
			onTheoryStateChange({ understoodIndices: newUnderstoodIndices });
		}
	};

	const isCurrentItemUnderstood = useMemo(() => {
		if (view === 'flashcards') {
			if (!flashcardState || !flashcardSet) return false;
			return flashcardState.understoodIndices.includes(flashcardIndex);
		}
		if (view === 'theory') {
			if (!theoryState || !theorySet) return false;
			return theoryState.understoodIndices.includes(theoryChapterIndex);
		}
		return false;
	}, [flashcardState, flashcardIndex, theoryState, theoryChapterIndex, view]);


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
						understoodCount={flashcardUnderstood}
						notUnderstoodCount={flashcardNotUnderstood}
						totalCards={flashcardSet.cards.length}
						onReset={onFlashcardReset}
						onBack={() => setShowFlashcardSummary(false)}
						isCompleted={allFlashcardsMarked}
					/>
				) : shouldShowTheorySummary && theorySet ? (
					<TheorySummary
						understoodCount={theoryUnderstood}
						notUnderstoodCount={theoryNotUnderstood}
						totalChapters={theorySet.chapters.length}
						onReset={onTheoryReset}
						onBack={() => setShowTheorySummary(false)}
						isCompleted={allTheoryChaptersMarked}
					/>
				) : view === "flashcards" ? (
					<Flashcards
						flashcardSet={flashcardSet}
						flashcardIndex={flashcardIndex}
						topic={topic}
						isCurrentUnderstood={isCurrentItemUnderstood}
					/>
				) : view === "quiz" ? (
					<Quiz
						quizSet={quizSet}
						quizState={quizState}
						onQuizStateChange={onQuizStateChange}
						language={language}
						topic={topic}
						currentQuestionIndex={currentQuestionIndex}
						onCurrentQuestionIndexChange={onCurrentQuestionIndexChange}
						apiKeys={apiKeys}
						apiKeyIndex={apiKeyIndex}
						onApiKeyIndexChange={onApiKeyIndexChange}
					/>
				) : (
					<Theory theorySet={theorySet} topic={topic} chapterIndex={theoryChapterIndex} isCurrentUnderstood={isCurrentItemUnderstood} />
				)}
			</CardContent>

			{/* Unified Toolbar */}
			<div className="flex justify-center pb-2">
				<div className="flex flex-wrap items-center justify-center gap-4 bg-background/30 backdrop-blur-sm p-2 rounded-md w-full max-w-2xl">
						<Tabs
							value={view}
							onValueChange={(value) => onViewChange(value as ViewType)}
							className="w-auto"
						>
							<TabsList>
								<TabsTrigger value="theory">Lý thuyết</TabsTrigger>
								<TabsTrigger value="flashcards">Flashcard</TabsTrigger>
								<TabsTrigger value="quiz">Trắc nghiệm</TabsTrigger>
							</TabsList>
						</Tabs>

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
								{view === "flashcards" ? "Thẻ" : view === "quiz" ? "Câu hỏi" : "Chương"} {hasContent ? currentIndex + 1 : 0} / {totalItems}
							</span>

							<Button
								onClick={handleNext}
								disabled={!hasContent || currentIndex >= totalItems - 1 || isNavDisabled}
								variant="outline"
								size="icon"
								className="h-9 w-9"
							>
								<ChevronRight className="h-4 w-4" />
							</Button>
							
							{(view === 'flashcards' || view === 'theory') && (
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
										onClick={() => view === 'flashcards' ? setShowFlashcardSummary(true) : setShowTheorySummary(true)}
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
	const [view, setView] = useState<ViewType>("theory")
	const [topic, setTopic] = useState("")
	const [language, setLanguage] = useState("English")
	const [flashcardMax, setFlashcardMax] = useState(50)
	const [quizMax, setQuizMax] = useState(50)
	const [isFlashcardLoading, setIsFlashcardLoading] = useState(false)
	const [isQuizLoading, setIsQuizLoading] = useState(false)
	const [isTheoryLoading, setIsTheoryLoading] = useState(false);
	const [flashcardSet, setFlashcardSet] = useState<CardSet | null>(null)
	const [quizSet, setQuizSet] = useState<QuizSet | null>(null)
	const [theorySet, setTheorySet] = useState<TheorySet | null>(null);
	const [quizState, setQuizState] = useState<QuizState | null>(null)
	const [flashcardState, setFlashcardState] = useState<FlashcardState | null>(null)
	const [theoryState, setTheoryState] = useState<TheoryState | null>(null);
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
	const [apiKeys, setApiKeys] = useState<string[]>([]);
	const [apiKeyIndex, setApiKeyIndex] = useState(0);
	
	const [flashcardIndex, setFlashcardIndex] = useState(0)
	const [showQuizSummary, setShowQuizSummary] = useState(false);
	const [showFlashcardSummary, setShowFlashcardSummary] = useState(false);
	const [showTheorySummary, setShowTheorySummary] = useState(false);
	const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
	const [theoryChapterIndex, setTheoryChapterIndex] = useState(0);

	// Prevent race conditions and cleanup async operations
	const isFlashcardGeneratingRef = useRef(false)
	const isQuizGeneratingRef = useRef(false)
	const isTheoryGeneratingRef = useRef(false);
	const isMountedRef = useRef(true)

	// Initialize once
	useEffect(() => {
		return () => {
			isMountedRef.current = false;
			closeDb();
			clearAllToastTimeouts();
		}
	}, []);

	useEffect(() => {
		setIsMounted(true)
	}, [])

	const handleApiKeyIndexChange = useCallback(async (index: number) => {
		if (apiKeyIndex === index) return;
		setApiKeyIndex(index);
		const db = await getDb();
		await db.put("data", { id: "apiKeyIndex", data: index });
	}, [apiKeyIndex]);

	const handleGenerate = useCallback(
		async (
			currentTopic: string,
			currentLanguage: string,
			forceNew: boolean = false,
			genType: "flashcards" | "quiz" | "theory"
		) => {
			if (!apiKeys || apiKeys.length === 0) {
				toast({
					title: "Thiếu API Key",
					description: "Vui lòng nhập API Key Gemini của bạn trong phần Cài đặt.",
					variant: "destructive",
				});
				return;
			}

			if (!currentTopic.trim()) {
				toast({
					title: "Chủ đề trống",
					description: "Vui lòng nhập một chủ đề để bắt đầu tạo.",
					variant: "destructive",
				})
				return
			}
			
			const isGeneratingRef = genType === 'flashcards' 
				? isFlashcardGeneratingRef
				: genType === 'quiz'
				? isQuizGeneratingRef
				: isTheoryGeneratingRef;

			const setIsLoading = genType === 'flashcards' 
				? setIsFlashcardLoading
				: genType === 'quiz'
				? setIsQuizLoading
				: setIsTheoryLoading;

			if (isGeneratingRef.current) {
				toast({
					title: "Đang tạo...",
					description: `Một quá trình tạo ${genType} khác đang chạy.`,
				})
				return
			}

			isGeneratingRef.current = true
			setIsLoading(true)

			const db = await getDb()

			try {
				if (genType === "flashcards") {
					if (forceNew) {
						setFlashcardSet(null)
						setFlashcardIndex(0)
						setFlashcardState(null)
						setShowFlashcardSummary(false);
						await db.delete("data", "flashcards")
						await db.delete("data", "flashcardState")
					}

					const existingData = (await db.get(
						"data",
						"flashcards"
					)) as LabeledData<CardSet>
					const currentSet =
						!forceNew && existingData && existingData.topic === currentTopic
							? existingData.data
							: { id: `idb-flashcards`, topic: currentTopic, cards: [] }

					if (isMountedRef.current && forceNew) {
						setFlashcardSet({ ...currentSet })
						setFlashcardState({ understoodIndices: [] });
					}

					let itemsNeeded = flashcardMax - currentSet.cards.length
					if (itemsNeeded <= 0) {
						setIsLoading(false)
						isGeneratingRef.current = false
						return
					}

					while (itemsNeeded > 0) {
						const count = Math.min(FLASHCARD_BATCH_SIZE, itemsNeeded)
						
						const { result: newCards, newApiKeyIndex } = await generateFlashcards({
							apiKeys,
							apiKeyIndex,
							topic: currentTopic,
							count,
							language: currentLanguage,
							existingCards: currentSet.cards,
						});

						await handleApiKeyIndexChange(newApiKeyIndex);

						if (
							Array.isArray(newCards) &&
							newCards.length > 0 &&
							isMountedRef.current
						) {
							currentSet.cards.push(...newCards)
							itemsNeeded -= newCards.length
							setFlashcardSet({ ...currentSet }) 
							await db.put("data", {
								id: "flashcards",
								topic: currentTopic,
								data: currentSet,
							} as any)
						} else {
							itemsNeeded = 0;
						}
						if(itemsNeeded > 0) await new Promise((resolve) => setTimeout(resolve, 1000));
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

					while (quizNeeded > 0) {
						const count = Math.min(QUIZ_BATCH_SIZE, quizNeeded)

						const { result: newQuestions, newApiKeyIndex } = await generateQuiz({
								apiKeys,
								apiKeyIndex,
								topic: currentTopic,
								count,
								language: currentLanguage,
								existingQuestions: currentQuiz.questions,
						});

						await handleApiKeyIndexChange(newApiKeyIndex);

						if (
							Array.isArray(newQuestions) &&
							newQuestions.length > 0 &&
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

				if (genType === "theory") {
					const theoryData = (await db.get("data", "theory")) as LabeledData<TheorySet>;
					const shouldForceNew = forceNew || !theoryData || theoryData.topic !== currentTopic;
			
					let currentTheorySet: TheorySet;
			
					if (shouldForceNew) {
						// This block runs when starting a new topic or forcing a reset.
						setTheorySet(null);
						setTheoryChapterIndex(0);
						setTheoryState(null);
						setShowTheorySummary(false);
						await db.delete("data", "theory");
						await db.delete("data", "theoryState");
						await db.delete("data", "theoryChapterIndex");
					
						const { result: outlineResult, newApiKeyIndex: outlineKeyIndex } = await generateTheoryOutline({
							apiKeys,
							apiKeyIndex,
							topic: currentTopic,
							language: currentLanguage,
						});
						await handleApiKeyIndexChange(outlineKeyIndex);
				
						if (!outlineResult?.outline || outlineResult.outline.length === 0) {
							throw new Error("Failed to generate a valid theory outline.");
						}
				
						currentTheorySet = {
							id: 'idb-theory',
							topic: currentTopic,
							outline: outlineResult.outline,
							chapters: outlineResult.outline.map(title => ({ title, content: null })),
						};
						
						if (isMountedRef.current) {
							setTheorySet(currentTheorySet);
							setTheoryState({ understoodIndices: [] });
							setTheoryChapterIndex(0);
						}
						await db.put("data", { id: "theory", topic: currentTopic, data: currentTheorySet } as any);
					} else {
						// This block runs when continuing an existing topic.
						currentTheorySet = theoryData.data;
					}
			
					// Now, generate content for chapters that are missing it.
					const chaptersToGenerate = currentTheorySet.chapters.map((ch, idx) => ({ ...ch, originalIndex: idx })).filter(ch => !ch.content);
			
					if (chaptersToGenerate.length === 0) {
						console.log("All theory chapters already have content.");
						setIsLoading(false);
						isGeneratingRef.current = false;
						return;
					}
			
					let currentKeyIndex = apiKeyIndex;
					for (const chapter of chaptersToGenerate) {
						if (!isMountedRef.current) break;
			
						const { result: chapterResult, newApiKeyIndex: chapterKeyIndex } = await generateTheoryChapter({
							apiKeys,
							apiKeyIndex: currentKeyIndex,
							topic: currentTopic,
							chapterTitle: chapter.title,
							language: currentLanguage,
						});
						
						currentKeyIndex = chapterKeyIndex;
						await handleApiKeyIndexChange(chapterKeyIndex);
			
						if (chapterResult?.content && isMountedRef.current) {
							const updatedChapters = [...currentTheorySet.chapters];
							updatedChapters[chapter.originalIndex] = { ...chapter, content: chapterResult.content };
							currentTheorySet.chapters = updatedChapters;
			
							setTheorySet({ ...currentTheorySet });
							await db.put("data", { id: "theory", topic: currentTopic, data: currentTheorySet } as any);
						}
						await new Promise(resolve => setTimeout(resolve, 500));
					}
				}

			} catch (error: any) {
				console.error(`🚫 ${genType} generation bị hủy hoặc lỗi:`, error.message)
				if (error instanceof AIOperationError) {
					if (error.code === 'API_KEY_REQUIRED' || error.code === 'ALL_KEYS_FAILED') {
						toast({
							title: "Lỗi API Key",
							description: error.code === 'ALL_KEYS_FAILED' 
								? "Tất cả các API key của bạn đều không thành công. Vui lòng kiểm tra lại."
								: "Vui lòng nhập API Key Gemini của bạn trong phần Cài đặt.",
							variant: "destructive",
						});
					} else {
						toast({
							title: "Lỗi tạo nội dung",
							description: `Không thể tạo ${genType}: ${error.message}. Vui lòng thử lại.`,
							variant: "destructive",
						})
					}
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
		[toast, flashcardMax, quizMax, apiKeys, apiKeyIndex, handleApiKeyIndexChange]
	)
	
	const loadInitialData = useCallback(async () => {
		const db = await getDb();
	
		// Migration from single 'apiKey' to 'apiKeys'
		const oldApiKeyRes = await db.get("data", "apiKey" as any);
		if (oldApiKeyRes?.data && typeof oldApiKeyRes.data === 'string') {
			await db.put("data", { id: "apiKeys", data: [oldApiKeyRes.data] });
			await db.delete("data", "apiKey" as any);
		}

		const [
			savedApiKeysRes,
			savedApiKeyIndexRes,
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
			theoryDataRes,
			theoryStateRes,
		] = await Promise.all([
			db.get("data", "apiKeys"),
			db.get("data", "apiKeyIndex"),
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
			db.get("data", "theory"),
			db.get("data", "theoryState"),
		]);
	
		const savedApiKeys = (savedApiKeysRes?.data as string[]) || [];
		const savedApiKeyIndex = (savedApiKeyIndexRes?.data as number) || 0;
		const savedView = (savedViewRes?.data as ViewType) || "theory";
		const savedTopic = (savedTopicRes?.data as string) || "Lịch sử La Mã";
		const savedLanguage = (savedLanguageRes?.data as string) || "Vietnamese";
		const savedFlashcardMax = (savedFlashcardMaxRes?.data as number) || 50;
		const savedQuizMax = (savedQuizMaxRes?.data as number) || 50;
		const savedVisibility = savedVisibilityRes?.data as ComponentVisibility;
		const savedBg = savedBgRes?.data as string;
		const savedUploadedBgs = (savedUploadedBgsRes?.data as string[]) || [];
		
		const flashcardData = flashcardDataRes as LabeledData<CardSet>;
		const flashcardStateData = flashcardStateRes as AppData;
		const quizData = quizDataRes as LabeledData<QuizSet>;
		const quizStateData = quizStateRes as AppData;
		const theoryData = theoryDataRes as LabeledData<TheorySet>;
		const theoryStateData = theoryStateRes as AppData;

		if (savedApiKeys) setApiKeys(savedApiKeys);
		setApiKeyIndex(savedApiKeyIndex < savedApiKeys.length ? savedApiKeyIndex : 0);
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
		
		let currentTheory = 
			theoryData && theoryData.topic === savedTopic ? theoryData.data : null;

	
		setFlashcardSet(currentFlashcards);
		setQuizSet(currentQuiz);
		setTheorySet(currentTheory);
		
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

		const currentTheoryState = (theoryData && theoryData.topic === savedTopic && theoryStateData)
			? theoryStateData.data as TheoryState
			: { understoodIndices: [] };
		setTheoryState(currentTheoryState);

		let initialTheoryIndex = 0;
		if (currentTheory && currentTheory.chapters.length > 0) {
			const firstUnseenIndex = currentTheory.chapters.findIndex(
				(_, index) => !currentTheoryState.understoodIndices.includes(index)
			);
			if (firstUnseenIndex !== -1) {
				initialTheoryIndex = firstUnseenIndex;
			}
		}
		setTheoryChapterIndex(initialTheoryIndex);

	}, []);
	

	const handleClearAllData = useCallback(async (isLearningReset: boolean = false) => {
		const db = await getDb();
	
		const keysToDelete: DataKey[] = [
			"flashcards", "flashcardState", "flashcardIndex",
			"quiz", "quizState",
			"theory", "theoryState", "theoryChapterIndex",
		];
	
		// Full reset also clears topic, settings, etc.
		if (!isLearningReset) {
			keysToDelete.push(
				'topic', 'language', 'view', 'visibility', 
				'background', 'uploadedBackgrounds', 
				'flashcardMax', 'quizMax'
			);
		}
	
		const tx = db.transaction("data", 'readwrite');
		const store = tx.objectStore("data");
		await Promise.all(keysToDelete.map(key => store.delete(key)));
		await tx.done;
	
		await loadInitialData(); // Reload all data from scratch
	
		toast({
			title: "Đã xóa dữ liệu",
			description: isLearningReset 
				? "Toàn bộ dữ liệu học tập đã được xóa." 
				: "Toàn bộ dữ liệu ứng dụng đã được xóa.",
		});
	}, [loadInitialData, toast]);

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
				// Since topic changed, clear old learning data
				await handleClearAllData(true);
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
			handleClearAllData
		]
	)

	const onGenerateType = useCallback(
		(genType: ViewType) => {
			const forceNew = false; // Never force new from settings buttons
			handleGenerate(topic, language, forceNew, genType);
		}, 
		[handleGenerate, topic, language]
	);


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

	const handleApiKeysChange = useCallback(
		async (newApiKeys: string[]) => {
			setApiKeys(newApiKeys);
			setApiKeyIndex(0); // Reset index when keys change
			const db = await getDb();
			await db.put("data", { id: "apiKeys", data: newApiKeys });
			await db.put("data", { id: "apiKeyIndex", data: 0 });
			toast({
				title: "Đã lưu API Keys",
				description: "Danh sách khóa API của bạn đã được lưu vào bộ nhớ cục bộ.",
			});
		},
		[toast]
	);

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
		async (newView: ViewType) => {
			if (view === newView) return
			setView(newView)
			setShowQuizSummary(false); // Hide summary when switching views
			setShowFlashcardSummary(false);
			setShowTheorySummary(false);
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

	const handleTheoryStateChange = useCallback(async (newState: TheoryState) => {
		setTheoryState(newState);
		const db = await getDb();
		await db.put("data", { id: "theoryState", data: newState });
	}, []);
	
	const handleTheoryReset = useCallback(async () => {
		const newTheoryState: TheoryState = {
			understoodIndices: [],
		};
		setTheoryState(newTheoryState);
		setShowTheorySummary(false);
		setTheoryChapterIndex(0);
	
		const db = await getDb();
		await db.put("data", { id: "theoryState", data: newTheoryState });
		await db.put("data", { id: "theoryChapterIndex", data: 0 });
	
		toast({
			title: "Bắt đầu lại",
			description: "Bạn có thể bắt đầu lại phần lý thuyết.",
		});
	}, [toast]);

	const onGenerateNew = useCallback(() => {
		// When clicking the main '+' button, we don't force a new generation.
		// It will continue generating based on the current state.
		const forceNew = false;
		handleGenerate(topic, language, forceNew, view)
	}, [handleGenerate, topic, language, view])

	const handleFlashcardIndexChange = useCallback(
		async (index: number) => {
			setFlashcardIndex(index);
			const db = await getDb();
			await db.put("data", { id: "flashcardIndex", data: index });
		},
		[] 
	);

	const handleTheoryChapterIndexChange = useCallback(
		async (index: number) => {
			setTheoryChapterIndex(index);
			const db = await getDb();
			await db.put("data", { id: "theoryChapterIndex", data: index });
		},
		[] 
	);

	const isOverallLoading = isFlashcardLoading || isQuizLoading || isTheoryLoading;
	const currentCount =
		view === "flashcards"
			? flashcardSet?.cards.length ?? 0
			: view === 'quiz'
			? quizSet?.questions.length ?? 0
			: view === 'theory'
			? (theorySet?.chapters?.filter(c => c.content).length ?? 0)
			: 0;
	
	const targetCount = view === "flashcards" 
		? flashcardMax 
		: view === 'quiz'
		? quizMax
		: (theorySet?.outline?.length ?? 0);

	const canGenerateMore = currentCount < targetCount && !isOverallLoading

	const currentViewIsLoading =
		view === "flashcards" 
			? isFlashcardLoading
			: view === 'quiz'
			? isQuizLoading
			: isTheoryLoading;
	

	if (!isMounted) {
		return null
	}
	
	const learnSettingsProps = {
		onSettingsChange: onSettingsSave,
		onGenerateType: onGenerateType,
		onClearLearningData: () => handleClearAllData(true),
		currentView: view,
		topic: topic,
		language: language,
		flashcardMax: flashcardMax,
		quizMax: quizMax,
		theoryCount: theorySet?.chapters?.filter(c => c.content).length ?? 0,
		theoryMax: theorySet?.outline?.length ?? 0,
		flashcardCount: flashcardSet?.cards.length ?? 0,
		quizCount: quizSet?.questions.length ?? 0,
		isTheoryLoading,
		isFlashcardLoading,
		isQuizLoading,
	};

	const globalSettingsProps = {
		onClearAllData: () => handleClearAllData(false),
		onVisibilityChange: handleVisibilityChange,
		onBackgroundChange: handleBackgroundChange,
		onUploadedBackgroundsChange: handleUploadedBackgroundsChange,
		onApiKeysChange: handleApiKeysChange,
		visibility: visibility,
		uploadedBackgrounds: uploadedBackgrounds,
		currentBackgroundImage: backgroundImage,
		apiKeys: apiKeys,
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
							theorySet={theorySet}
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
							showTheorySummary={showTheorySummary}
							setShowTheorySummary={setShowTheorySummary}
							flashcardState={flashcardState}
							onFlashcardStateChange={handleFlashcardStateChange}
							onFlashcardReset={handleFlashcardReset}
							theoryState={theoryState}
							onTheoryStateChange={handleTheoryStateChange}
							onTheoryReset={handleTheoryReset}
							settingsProps={learnSettingsProps}
							currentQuestionIndex={currentQuestionIndex}
							onCurrentQuestionIndexChange={handleCurrentQuestionIndexChange}
							theoryChapterIndex={theoryChapterIndex}
							onTheoryChapterIndexChange={handleTheoryChapterIndexChange}
							apiKeys={apiKeys}
							apiKeyIndex={apiKeyIndex}
							onApiKeyIndexChange={handleApiKeyIndexChange}
						/>
					</div>
				</div>
			)}
		</main>
	)
}


