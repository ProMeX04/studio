
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
import { Loader, Plus } from "lucide-react"
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
import { ChatAssistant } from "@/components/ChatAssistant"
import type { Flashcard } from "@/ai/schemas"
import { Button } from "@/components/ui/button"

const BATCH_SIZE = 5

interface LearnProps {
	view: "flashcards" | "quiz"
	isLoading: boolean
	flashcardSet: FlashcardSet | null
	quizSet: QuizSet | null
	quizState: QuizState | null
	onGenerateNew: () => void
	onQuizStateChange: (newState: QuizState) => void
	flashcardIsRandom: boolean
	onCurrentCardChange: (flashcard: Flashcard | null) => void
	canGenerateMore: boolean
	onFlashcardIndexChange: (index: number) => void
	flashcardIndex: number
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
	onCurrentCardChange,
	canGenerateMore,
	flashcardIndex,
	onFlashcardIndexChange,
}: LearnProps) {
	const hasLearnContent =
		(view === "flashcards" &&
			flashcardSet &&
			flashcardSet.cards.length > 0) ||
		(view === "quiz" && quizSet && quizSet.questions.length > 0)

	return (
		<Card className="w-full bg-transparent shadow-none border-none p-0 relative min-h-[300px] flex flex-col flex-grow">
			<CardContent className="pt-8 flex-grow flex flex-col">
				{view === "flashcards" && (
					<Flashcards
						flashcardSet={flashcardSet}
						isRandom={flashcardIsRandom}
						onCurrentCardChange={onCurrentCardChange}
						onGenerateMore={onGenerateNew}
						canGenerateMore={canGenerateMore}
						isLoading={isLoading}
						initialIndex={flashcardIndex}
						onIndexChange={onFlashcardIndexChange}
					/>
				)}
				{view === "quiz" && (
					<Quiz
						quizSet={quizSet}
						initialState={quizState}
						onStateChange={onQuizStateChange}
						onGenerateMore={onGenerateNew}
						canGenerateMore={canGenerateMore}
						isLoading={isLoading}
					/>
				)}
			</CardContent>
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
	const [assistantContext, setAssistantContext] = useState("")
	const [currentFlashcard, setCurrentFlashcard] = useState<Flashcard | null>(
		null
	)
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

			// Helper function với timeout và retry
			const safeAICall = async (
				aiFunction: () => Promise<any>,
				retries = 3,
				timeoutMs = 30000
			): Promise<any> => {
				for (let attempt = 0; attempt < retries; attempt++) {
					if (signal.aborted) throw new Error("Aborted")

					try {
						const timeoutPromise = new Promise((_, reject) => {
							setTimeout(
								() => reject(new Error("AI_TIMEOUT")),
								timeoutMs
							)
						})
						const result = await Promise.race([
							aiFunction(),
							timeoutPromise,
						])
						return result
					} catch (error: any) {
						console.warn(
							`🔄 AI call attempt ${
								attempt + 1
							} failed:`,
							error.message
						)
						if (attempt === retries - 1) throw error
						const delay = Math.min(
							1000 * Math.pow(2, attempt),
							5000
						)
						await new Promise((resolve) =>
							setTimeout(resolve, delay)
						)
					}
				}
			}

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
							})
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
							})
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
				if (error.name === "AbortError") {
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

			if (topic !== newTopic) {
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

	const handleCurrentCardChange = useCallback((card: Flashcard | null) => {
		setCurrentFlashcard(card)
	}, [])

	useEffect(() => {
		const getAssistantContext = (): string => {
			let context = `Người dùng đang học về chủ đề: ${topic}.`
			
			if (view === "quiz" && quizSet && quizState) {
				const currentQuestion: QuizQuestion | undefined =
					quizSet.questions[quizState.currentQuestionIndex]
				if (currentQuestion) {
					context += ` Họ đang ở câu hỏi trắc nghiệm: "${
						currentQuestion.question
					}" với các lựa chọn: ${currentQuestion.options.join(
						", "
					)}. Câu trả lời đúng là ${currentQuestion.answer}.`
					
					const userAnswer =
						quizState.answers[quizState.currentQuestionIndex]
							?.selected
					if (userAnswer) {
						context += ` Người dùng đã chọn "${userAnswer}".`
					}
				}
			} else if (view === "flashcards" && currentFlashcard) {
				context += ` Người dùng đang xem flashcard: Mặt trước "${currentFlashcard.front}", Mặt sau "${currentFlashcard.back}".`
			}
			return context
		}

		setAssistantContext(getAssistantContext())
	}, [
		view,
		topic,
		quizSet,
		quizState,
		currentFlashcard,
	])

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
		<main className="relative min-h-screen w-full lg:grid lg:grid-cols-2 lg:gap-8">
			{backgroundImage && (
				<div
					className="absolute inset-0 bg-cover bg-center"
					style={{ backgroundImage: `url(${backgroundImage})` }}
				>
					<div className="absolute inset-0 bg-black/60"></div>
				</div>
			)}

			{/* Left Column */}
			<div className="relative flex flex-col justify-between p-4 sm:p-8 md:p-12">
				<div className="flex justify-between items-start">
					{visibility.greeting && <Greeting />}
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
				</div>

				<div className="flex flex-col items-center justify-center space-y-8 w-full max-w-xl mx-auto">
					{visibility.clock && <Clock />}
					{visibility.search && <Search />}
				</div>

				<div className="w-full">
					{visibility.quickLinks && <QuickLinks />}
				</div>
			</div>

			{/* Right Column */}
			{visibility.learn && (
				<div className="relative flex flex-col justify-center gap-8 p-4 sm:p-8 md:p-12 max-h-screen">
					<div className="flex-grow overflow-y-auto flex flex-col">
						<Learn
							view={view}
							isLoading={currentViewIsLoading}
							flashcardSet={flashcardSet}
							quizSet={quizSet}
							quizState={quizState}
							onGenerateNew={onGenerateNew}
							onQuizStateChange={handleQuizStateChange}
							flashcardIsRandom={flashcardIsRandom}
							onCurrentCardChange={handleCurrentCardChange}
							canGenerateMore={canGenerateMore}
							flashcardIndex={flashcardIndex}
							onFlashcardIndexChange={handleFlashcardIndexChange}
						/>
					</div>
					<div className="flex-shrink-0">
						<ChatAssistant context={assistantContext} />
					</div>
				</div>
			)}
		</main>
	)
}

    
