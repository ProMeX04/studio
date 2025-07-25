
"use client"

import React, { useState, useEffect, useCallback, useRef } from "react"
import { Greeting } from "@/components/Greeting"
import { Search } from "@/components/Search"
import { QuickLinks } from "@/components/QuickLinks"
import { Clock } from "@/components/Clock"
import { Flashcards } from "@/components/Flashcards"
import type { FlashcardSet } from "@/ai/schemas"
import { Quiz } from "@/components/Quiz"
import type { QuizSet, QuizQuestion } from "@/ai/schemas"
import type { QuizState } from "@/app/types"
import { useToast, clearAllToastTimeouts } from "@/hooks/use-toast"
import { generateFlashcards } from "@/ai/flows/generate-flashcards"
import { generateQuiz } from "@/ai/flows/generate-quiz"
import { Loader, Plus, ChevronLeft, ChevronRight } from "lucide-react"
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

const BATCH_SIZE = 5;

interface LearnProps {
	view: "flashcards" | "quiz"
	isLoading: boolean
	flashcardSet: FlashcardSet | null
	quizSet: QuizSet | null
	quizState: QuizState | null
	onGenerateNew: () => void
	onQuizStateChange: (newState: QuizState) => void
	flashcardIsRandom: boolean
	canGenerateMore: boolean
	onFlashcardIndexChange: (index: number) => void
	flashcardIndex: number
	onViewChange: (view: "flashcards" | "quiz") => void
	language: string
	topic: string
}

function Learn({
	view,
	isLoading,
	flashcardSet,
	quizSet,
	quizState,
	onGenerateNew,
	onQuizStateChange,
	flashcardIsRandom,
	canGenerateMore,
	flashcardIndex,
	onFlashcardIndexChange,
	onViewChange,
	language,
	topic,
}: LearnProps) {
	const currentCount = view === "flashcards" ? flashcardSet?.cards.length ?? 0 : quizSet?.questions.length ?? 0;
	const currentIndex = view === "flashcards" ? flashcardIndex : (quizState?.currentQuestionIndex ?? 0);
	const totalItems = view === "flashcards" ? flashcardSet?.cards.length ?? 0 : quizSet?.questions.length ?? 0;
	const hasContent = totalItems > 0;

	const handleNext = () => {
		if (view === 'flashcards') {
			if (flashcardIndex < totalItems - 1) onFlashcardIndexChange(flashcardIndex + 1);
		} else if (quizSet && quizState) {
			if (quizState.currentQuestionIndex < totalItems - 1) {
				onQuizStateChange({ ...quizState, currentQuestionIndex: quizState.currentQuestionIndex + 1 });
			}
		}
	};
	
	const handlePrev = () => {
		if (view === 'flashcards') {
			if (flashcardIndex > 0) onFlashcardIndexChange(flashcardIndex - 1);
		} else if (quizSet && quizState) {
			if (quizState.currentQuestionIndex > 0) {
				onQuizStateChange({ ...quizState, currentQuestionIndex: quizState.currentQuestionIndex - 1 });
			}
		}
	};
	
	return (
		<Card className="w-full h-full bg-transparent shadow-none border-none p-0 flex flex-col">
			<CardContent className="flex-grow flex flex-col p-0">
				{view === "flashcards" && (
					<Flashcards
						flashcardSet={flashcardSet}
						isRandom={flashcardIsRandom}
						initialIndex={flashcardIndex}
						onIndexChange={onFlashcardIndexChange}
						topic={topic}
					/>
				)}
				{view === "quiz" && (
					<Quiz
						quizSet={quizSet}
						initialState={quizState}
						onStateChange={onQuizStateChange}
						language={language}
						topic={topic}
					/>
				)}
			</CardContent>

			{/* Unified Toolbar */}
			<div className="flex justify-center pb-2">
				<div className="inline-flex items-center justify-center bg-background/30 backdrop-blur-sm p-2 rounded-md w-full max-w-sm">
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
								disabled={currentIndex === 0 || !hasContent}
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
								disabled={!hasContent || currentIndex >= totalItems - 1}
								variant="outline"
								size="icon"
								className="h-9 w-9"
							>
								<ChevronRight className="h-4 w-4" />
							</Button>

							<Button
								onClick={onGenerateNew}
								disabled={isLoading || !canGenerateMore}
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
	const [flashcardIsRandom, setFlashcardIsRandom] = useState(false)
	const [isFlashcardLoading, setIsFlashcardLoading] = useState(false)
	const [isQuizLoading, setIsQuizLoading] = useState(false)
	const [flashcardSet, setFlashcardSet] = useState<FlashcardSet | null>(null)
	const [quizSet, setQuizSet] = useState<QuizSet | null>(null)
	const [quizState, setQuizState] = useState<QuizState | null>(null)
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

	// Ngăn race condition và cleanup async operations
	const isFlashcardGeneratingRef = useRef(false)
	const isQuizGeneratingRef = useRef(false)
	const abortControllerRef = useRef<AbortController | null>(null)
	const isMountedRef = useRef(true)

	// Khởi tạo đồng bộ multi-tab - chỉ chạy 1 lần
	useEffect(() => {
		const channel = initBroadcastChannel()

		// Không cần lắng nghe từ tab khác nữa - mỗi tab hoạt động độc lập
		console.log("📡 Tab hoạt động độc lập, không sync data")

		return () => {
			// Cleanup khi component unmount
			isMountedRef.current = false
			closeBroadcastChannel()
			closeDb() // Đóng IndexedDB connection
			clearAllToastTimeouts() // Clear toast timeouts

			// Hủy tất cả async operations đang chạy
			if (abortControllerRef.current) {
				abortControllerRef.current.abort()
			}
		}
	}, []) // Không có dependencies → chỉ chạy 1 lần

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

			// Ngăn nhiều lần gọi đồng thời cho cùng một loại
			if (isGeneratingRef.current) {
				toast({
					title: "Đang tạo...",
					description: `Một quá trình tạo ${genType === 'flashcards' ? 'flashcard' : 'quiz'} khác đang chạy.`,
				})
				return
			}

			isGeneratingRef.current = true
			setIsLoading(true)

			// Hủy operation cũ nếu có
			if (abortControllerRef.current) {
				abortControllerRef.current.abort()
			}

			// Tạo AbortController mới
			abortControllerRef.current = new AbortController()
			const signal = abortControllerRef.current.signal

			const db = await getDb()

			try {
				if (genType === "flashcards") {
					if (forceNew) {
						setFlashcardSet(null)
						setFlashcardIndex(0)
						await db.delete("data", "flashcards")
						await db.delete("data", "flashcardIndex")
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

							// Hiển thị ngay lập tức
							setFlashcardSet({ ...currentFlashcards }) 

							await db.put("data", {
								id: "flashcards",
								topic: currentTopic,
								data: currentFlashcards,
							} as any)
						} else {
							// Nếu không có thẻ mới, dừng lại
							flashcardsNeeded = 0;
						}
						// Rate limiting: chờ giữa các batch
						if(flashcardsNeeded > 0) await new Promise((resolve) => setTimeout(resolve, 1000));
					}
				}

				if (genType === "quiz") {
					if (forceNew) {
						setQuizSet(null)
						setQuizState(null)
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
							
							// Hiển thị ngay lập tức
							setQuizSet({ ...currentQuiz })

							await db.put("data", {
								id: "quiz",
								topic: currentTopic,
								data: currentQuiz,
							} as any)
						} else {
							// Nếu không có câu hỏi mới, dừng lại
							quizNeeded = 0;
						}
						// Rate limiting: chờ giữa các batch
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

		const savedView =
			((await db.get("data", "view"))?.data as "flashcards" | "quiz") ||
			"flashcards"
		const savedTopic =
			((await db.get("data", "topic"))?.data as string) || "Lịch sử La Mã"
		const savedLanguage =
			((await db.get("data", "language"))?.data as string) || "Vietnamese"
		const savedFlashcardMax =
			((await db.get("data", "flashcardMax"))?.data as number) || 50
		const savedQuizMax =
			((await db.get("data", "quizMax"))?.data as number) || 50
		const savedFlashcardIsRandom =
			((await db.get("data", "flashcardIsRandom"))?.data as boolean) ||
			false
		const savedVisibility = (await db.get("data", "visibility"))
			?.data as ComponentVisibility
		const savedBg = (await db.get("data", "background"))?.data as string
		const savedUploadedBgs =
			((await db.get("data", "uploadedBackgrounds"))?.data as string[]) ||
			[]
		const savedFlashcardIndex =
			((await db.get("data", "flashcardIndex"))?.data as number) || 0

		const flashcardData = (await db.get(
			"data",
			"flashcards"
		)) as LabeledData<FlashcardSet>
		const quizData = (await db.get("data", "quiz")) as LabeledData<QuizSet>
		const quizStateData = (await db.get("data", "quizState")) as AppData

		if (savedBg) setBackgroundImage(savedBg)
		setUploadedBackgrounds(savedUploadedBgs)

		setView(savedView)
		setTopic(savedTopic)
		setLanguage(savedLanguage)
		setFlashcardMax(savedFlashcardMax)
		setQuizMax(savedQuizMax)
		setFlashcardIsRandom(savedFlashcardIsRandom)
		setVisibility(
			savedVisibility ?? {
				clock: true,
				greeting: true,
				search: true,
				quickLinks: true,
				learn: true,
			}
		)
		setFlashcardIndex(savedFlashcardIndex)

		const currentFlashcards =
			flashcardData && flashcardData.topic === savedTopic
				? flashcardData.data
				: null
		const currentQuiz =
			quizData && quizData.topic === savedTopic ? quizData.data : null

		setFlashcardSet(currentFlashcards)
		setQuizSet(currentQuiz)

		if (quizData && quizData.topic === savedTopic && quizStateData) {
			setQuizState(quizStateData.data)
		} else {
			setQuizState(null)
		}
	}, [])

	const handleClearAllData = useCallback(async () => {
		const db = await getDb()
		await clearAllData(db)
		// Tải lại toàn bộ dữ liệu ban đầu
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
			flashcardIsRandom: boolean
		}) => {
			const {
				topic: newTopic,
				language: newLanguage,
				flashcardMax: newFlashcardMax,
				quizMax: newQuizMax,
				flashcardIsRandom: newFlashcardIsRandom,
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
			if (flashcardIsRandom !== newFlashcardIsRandom) {
				setFlashcardIsRandom(newFlashcardIsRandom)
				await db.put("data", {
					id: "flashcardIsRandom",
					data: newFlashcardIsRandom,
				})
			}

			// Logic đã được chuyển sang onGenerateFromSettings
		},
		[topic, language, flashcardMax, quizMax, flashcardIsRandom]
	)

	const onGenerateFromSettings = useCallback(
		(newTopic: string) => {
			handleGenerate(newTopic, language, true, view);
		}, 
		[handleGenerate, language, view]
	)


	// Không tự động generate khi thay đổi max nữa
	useEffect(() => {
		// No-op
	}, [flashcardMax, quizMax])


	const handleBackgroundChange = useCallback(
		async (newBg: string | null) => {
			// Nếu không thay đổi, bỏ qua
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
			// So sánh mảng đơn giản bằng toString()
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
			// Nếu không thay đổi, bỏ qua
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

			// Đồng bộ với tab khác
			broadcastDataChange("visibility" as DataKey, {
				data: newVisibility,
			})
		},
		[visibility]
	)

	const handleViewChange = useCallback(
		async (newView: "flashcards" | "quiz") => {
			if (view === newView) return
			setView(newView)
			const db = await getDb()
			await db.put("data", { id: "view", data: newView })
		},
		[view]
	)

	const handleQuizStateChange = useCallback(async (newState: QuizState) => {
		setQuizState(newState)
		const db = await getDb()
		await db.put("data", { id: "quizState", data: newState })
	}, [])

	const onGenerateNew = useCallback(() => {
		// Gọi generate cho view hiện tại, không force new
		handleGenerate(topic, language, false, view)
	}, [handleGenerate, topic, language, view])

	const handleFlashcardIndexChange = useCallback(
		async (index: number) => {
			setFlashcardIndex(index)
			const db = await getDb()
			await db.put("data", { id: "flashcardIndex", data: index })
		},
		[] // No dependencies, we only want to save the raw index
	)

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
					<Settings
						onSettingsChange={onSettingsSave}
						onClearAllData={handleClearAllData}
						onVisibilityChange={handleVisibilityChange}
						onBackgroundChange={handleBackgroundChange}
						onUploadedBackgroundsChange={
							handleUploadedBackgroundsChange
						}
						onViewChange={handleViewChange}
						onGenerateNew={onGenerateFromSettings}
						currentView={view}
						visibility={visibility}
						uploadedBackgrounds={uploadedBackgrounds}
						currentBackgroundImage={backgroundImage}
						topic={topic}
						language={language}
						flashcardMax={flashcardMax}
						quizMax={quizMax}
						flashcardIsRandom={flashcardIsRandom}
					/>
					{visibility.greeting && <Greeting />}
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
							flashcardIsRandom={flashcardIsRandom}
							canGenerateMore={canGenerateMore}
							flashcardIndex={flashcardIndex}
							onFlashcardIndexChange={handleFlashcardIndexChange}
							onViewChange={handleViewChange}
							language={language}
							topic={topic}
						/>
					</div>
				</div>
			)}
		</main>
	)
}

    
    