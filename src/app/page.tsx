
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
}: LearnProps) {
	const hasLearnContent =
		(view === "flashcards" &&
			flashcardSet &&
			flashcardSet.cards.length > 0) ||
		(view === "quiz" && quizSet && quizSet.questions.length > 0)

	return (
		<Card className="w-full bg-transparent shadow-none border-none p-0 relative min-h-[300px] flex flex-col flex-grow">
			<CardContent className="pt-8 flex-grow flex flex-col">
				{isLoading && !hasLearnContent && (
					<div className="flex flex-col justify-center items-center h-48">
						<Loader className="animate-spin mb-4" />
						<p>Đang tạo nội dung mới cho chủ đề của bạn...</p>
					</div>
				)}

				{view === "flashcards" && (
					<Flashcards
						flashcardSet={flashcardSet}
						isRandom={flashcardIsRandom}
						onCurrentCardChange={onCurrentCardChange}
						onGenerateMore={onGenerateNew}
						canGenerateMore={canGenerateMore}
						isLoading={isLoading}
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
	const [isLoading, setIsLoading] = useState(false)
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

	// Ngăn race condition và cleanup async operations
	const isGeneratingRef = useRef(false)
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
				return
			}

			// Ngăn nhiều lần gọi đồng thời
			if (isGeneratingRef.current) {
				console.log("⚠️ handleGenerate đang chạy, bỏ qua lần gọi này")
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
				if (forceNew) {
					// Xóa dữ liệu cũ của cả 2 loại khi chủ đề thay đổi
					setFlashcardSet(null)
					setQuizSet(null)
					setQuizState(null)
					await db.delete("data", "flashcards")
					await db.delete("data", "quiz")
					await db.delete("data", "quizState")
				}

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

				if (genType === "flashcards") {
					const flashcardData = (await db.get(
						"data",
						"flashcards"
					)) as LabeledData<FlashcardSet>
					const currentFlashcards =
						flashcardData && flashcardData.topic === currentTopic
							? flashcardData.data
							: { id: "idb-flashcards", topic: currentTopic, cards: [] }

					setFlashcardSet({ ...currentFlashcards })

					let flashcardsNeeded = flashcardMax - currentFlashcards.cards.length
					if (flashcardsNeeded <= 0 && !forceNew) {
						setIsLoading(false)
						isGeneratingRef.current = false
						return
					}

					while (flashcardsNeeded > 0 && !signal.aborted) {
						const count = Math.min(BATCH_SIZE, flashcardsNeeded)
						try {
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
								await db.put("data", {
									id: "flashcards",
									topic: currentTopic,
									data: currentFlashcards,
								} as any)
								setFlashcardSet({ ...currentFlashcards }) // Update UI
							} else {
								// Nếu không có thẻ mới, dừng lại
								flashcardsNeeded = 0;
							}
						} catch (error: any) {
							console.error("❌ Flashcard generation batch failed:", error.message)
							flashcardsNeeded = 0
						}
						// Rate limiting: chờ giữa các batch
						if(flashcardsNeeded > 0) await new Promise((resolve) => setTimeout(resolve, 1000));
					}
				}

				if (genType === "quiz") {
					const quizData = (await db.get(
						"data",
						"quiz"
					)) as LabeledData<QuizSet>
					const currentQuiz =
						quizData && quizData.topic === currentTopic
							? quizData.data
							: { id: "idb-quiz", topic: currentTopic, questions: [] }

					setQuizSet({ ...currentQuiz })

					let quizNeeded = quizMax - currentQuiz.questions.length
					if (quizNeeded <= 0 && !forceNew) {
						setIsLoading(false)
						isGeneratingRef.current = false
						return
					}

					while (quizNeeded > 0 && !signal.aborted) {
						const count = Math.min(BATCH_SIZE, quizNeeded)
						try {
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
								await db.put("data", {
									id: "quiz",
									topic: currentTopic,
									data: currentQuiz,
								} as any)
								setQuizSet({ ...currentQuiz }) // Update UI
							} else {
								// Nếu không có câu hỏi mới, dừng lại
								quizNeeded = 0;
							}
						} catch (error: any) {
							console.error("❌ Quiz generation batch failed:", error.message)
							quizNeeded = 0
						}
						// Rate limiting: chờ giữa các batch
						if(quizNeeded > 0) await new Promise((resolve) => setTimeout(resolve, 1000));
					}
				}

			} catch (error: any) {
				console.log("🚫 Generation bị hủy hoặc lỗi:", error.message)
				if (error.name === "AbortError") {
					console.log("✅ Generation đã được hủy thành công")
				} else {
					toast({
						title: "Lỗi tạo nội dung",
						description: "Có lỗi xảy ra khi tạo nội dung. Vui lòng thử lại.",
						variant: "destructive",
					})
				}
			} finally {
				isGeneratingRef.current = false
				setIsLoading(false)
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

	useEffect(() => {
		if (isMounted) {
			loadInitialData()
		}
	}, [isMounted, loadInitialData])

	const onSettingsSave = useCallback(
		async (settings: { topic: string; language: string }) => {
			const { topic: newTopic, language: newLanguage } = settings
			const topicChanged = newTopic !== topic || newLanguage !== language

			setTopic(newTopic)
			setLanguage(newLanguage)

			const db = await getDb()
			await db.put("data", { id: "topic", data: newTopic })
			await db.put("data", { id: "language", data: newLanguage })

			// Đồng bộ với tab khác
			broadcastDataChange("topic" as DataKey, { data: newTopic })
			broadcastDataChange("language" as DataKey, { data: newLanguage })

			if (topicChanged) {
				// Chỉ tạo cho view hiện tại khi thay đổi chủ đề
				handleGenerate(newTopic, newLanguage, true, view)
			}
		},
		[topic, language, handleGenerate, view]
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

	const handleFlashcardSettingsChange = useCallback(
		async (settings: { isRandom: boolean }) => {
			if (flashcardIsRandom === settings.isRandom) return

			setFlashcardIsRandom(settings.isRandom)
			const db = await getDb()
			await db.put("data", {
				id: "flashcardIsRandom",
				data: settings.isRandom,
			})
		},
		[flashcardIsRandom]
	)

	const handleCurrentCardChange = useCallback((card: Flashcard | null) => {
		setCurrentFlashcard(card)
	}, [])

	const createInstantUpdater = <T,>(
		setter: (value: T) => void,
		dbKey: string
	) => {
		return useCallback(
			async (value: T) => {
				setter(value)
				const db = await getDb()
				await db.put("data", { id: dbKey, data: value } as any)
			},
			[setter, dbKey]
		)
	}

	const handleFlashcardMaxChange = createInstantUpdater(
		setFlashcardMax,
		"flashcardMax"
	)
	const handleQuizMaxChange = createInstantUpdater(setQuizMax, "quizMax")

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

	const currentCount =
		view === "flashcards"
			? flashcardSet?.cards.length ?? 0
			: quizSet?.questions.length ?? 0
	const targetCount = view === "flashcards" ? flashcardMax : quizMax
	const canGenerateMore = currentCount < targetCount && !isLoading

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
						onSettingsSave={onSettingsSave}
						onVisibilityChange={handleVisibilityChange}
						onBackgroundChange={handleBackgroundChange}
						onUploadedBackgroundsChange={
							handleUploadedBackgroundsChange
						}
						onFlashcardSettingsChange={
							handleFlashcardSettingsChange
						}
						onViewChange={handleViewChange}
						onFlashcardMaxChange={handleFlashcardMaxChange}
						onQuizMaxChange={handleQuizMaxChange}
						currentView={view}
						visibility={visibility}
						uploadedBackgrounds={uploadedBackgrounds}
						currentBackgroundImage={backgroundImage}
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
							isLoading={isLoading}
							flashcardSet={flashcardSet}
							quizSet={quizSet}
							quizState={quizState}
							onGenerateNew={onGenerateNew}
							onQuizStateChange={handleQuizStateChange}
							flashcardIsRandom={flashcardIsRandom}
							onCurrentCardChange={handleCurrentCardChange}
							canGenerateMore={canGenerateMore}
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
