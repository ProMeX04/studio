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
import { Loader } from "lucide-react"
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
	saveGenerationState,
	getGenerationState,
	clearGenerationState,
	checkInterruptedGeneration,
} from "@/lib/idb"
import { ChatAssistant } from "@/components/ChatAssistant"
import type { Flashcard } from "@/ai/schemas"

const BATCH_SIZE = 5

interface LearnProps {
	view: "flashcards" | "quiz"
	isLoading: boolean
	flashcardSet: FlashcardSet | null
	quizSet: QuizSet | null
	quizState: QuizState | null
	onGenerateNew: (forceNew: boolean) => void
	generationProgress: number
	targetCount: number
	onQuizStateChange: (newState: QuizState) => void
	flashcardIsRandom: boolean
	onCurrentCardChange: (flashcard: Flashcard | null) => void
}

function Learn({
	view,
	isLoading,
	flashcardSet,
	quizSet,
	quizState,
	onGenerateNew,
	targetCount,
	onQuizStateChange,
	flashcardIsRandom,
	onCurrentCardChange,
}: LearnProps) {
	const { toast } = useToast()
	const currentCount =
		view === "flashcards"
			? flashcardSet?.cards.length || 0
			: quizSet?.questions.length || 0
	const canGenerateMore = currentCount < targetCount

	const handleGenerateClick = () => {
		if (canGenerateMore) {
			onGenerateNew(false) // Never force new, always append
		} else {
			toast({
				title: "Đã đạt số lượng tối đa",
				description:
					"Vui lòng tăng số lượng tối đa trong cài đặt để tạo thêm.",
			})
		}
	}

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
					/>
				)}
				{view === "quiz" && (
					<Quiz
						quizSet={quizSet}
						initialState={quizState}
						onStateChange={onQuizStateChange}
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
	const [generationProgress, setGenerationProgress] = useState(0)
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
			forceNew: boolean = false
		) => {
			if (!currentTopic.trim()) {
				return
			}

			// Ngăn nhiều lần gọi đồng thời
			if (isGeneratingRef.current && !forceNew) {
				console.log("⚠️ handleGenerate đang chạy, bỏ qua lần gọi này")
				return
			}

			const db = await getDb()
			const flashcardData = (await db.get(
				"data",
				"flashcards"
			)) as LabeledData<FlashcardSet>
			const quizData = (await db.get(
				"data",
				"quiz"
			)) as LabeledData<QuizSet>

			let currentFlashcardCount = 0
			let currentQuizCount = 0

			if (flashcardData && flashcardData.topic === currentTopic) {
				currentFlashcardCount = flashcardData.data.cards.length
			}
			if (quizData && quizData.topic === currentTopic) {
				currentQuizCount = quizData.data.questions.length
			}

			// Check if we need to generate
			const needFlashcards = currentFlashcardCount < flashcardMax
			const needQuiz = currentQuizCount < quizMax

			if (!forceNew && !needFlashcards && !needQuiz) {
				console.log("✅ Đã đủ nội dung, không cần generate")
				return
			}

			console.log(
				`🚀 Bắt đầu generate - Flashcards: ${needFlashcards}, Quiz: ${needQuiz}`
			)

			// Hủy operation cũ nếu có
			if (abortControllerRef.current) {
				abortControllerRef.current.abort()
			}

			// Tạo AbortController mới
			abortControllerRef.current = new AbortController()
			const signal = abortControllerRef.current.signal

			isGeneratingRef.current = true
			setIsLoading(true)
			setGenerationProgress(0)

			// Save generation state
			await saveGenerationState({
				topic: currentTopic,
				language: currentLanguage,
				isGenerating: true,
				startTime: Date.now(),
				targetFlashcards: flashcardMax,
				targetQuiz: quizMax,
				currentFlashcards: currentFlashcardCount,
				currentQuiz: currentQuizCount,
			})

			let currentFlashcards: FlashcardSet = {
				id: "idb-flashcards",
				topic: currentTopic,
				cards: [],
			}
			let currentQuiz: QuizSet = {
				id: "idb-quiz",
				topic: currentTopic,
				questions: [],
			}

			if (forceNew) {
				setFlashcardSet(null)
				setQuizSet(null)
				setQuizState(null)
				await db.delete("data", "flashcards")
				await db.delete("data", "quiz")
				await db.delete("data", "quizState")
			} else {
				const flashcardData = (await db.get(
					"data",
					"flashcards"
				)) as LabeledData<FlashcardSet>
				const quizData = (await db.get(
					"data",
					"quiz"
				)) as LabeledData<QuizSet>
				if (flashcardData && flashcardData.topic === currentTopic) {
					currentFlashcards = flashcardData.data
				}
				if (quizData && quizData.topic === currentTopic) {
					currentQuiz = quizData.data
				}
			}

			setFlashcardSet(currentFlashcards)
			setQuizSet(currentQuiz)

			try {
				const flashcardsNeeded =
					flashcardMax - currentFlashcards.cards.length
				const quizNeeded = quizMax - currentQuiz.questions.length

				if (flashcardsNeeded <= 0 && quizNeeded <= 0 && !forceNew) {
					setIsLoading(false)
					return
				}

				// Tính tổng batch cần sinh cho mỗi loại
				let remainingFlashcards = Math.max(0, flashcardsNeeded)
				let remainingQuiz = Math.max(0, quizNeeded)

				// Tổng lần sinh dữ liệu (bất kể loại nào)
				const totalBatches =
					Math.ceil(remainingFlashcards / BATCH_SIZE) +
					Math.ceil(remainingQuiz / BATCH_SIZE)

				let completedBatches = 0

				// Helper function với timeout và retry
				const safeAICall = async (
					aiFunction: () => Promise<any>,
					retries = 3,
					timeoutMs = 30000
				): Promise<any> => {
					for (let attempt = 0; attempt < retries; attempt++) {
						if (signal.aborted) throw new Error("Aborted")

						try {
							// Timeout wrapper
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
								`🔄 AI call attempt ${attempt + 1} failed:`,
								error.message
							)

							if (attempt === retries - 1) throw error

							// Exponential backoff với rate limiting
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

				while (
					(remainingFlashcards > 0 || remainingQuiz > 0) &&
					!signal.aborted
				) {
					// Rate limiting: chờ giữa các batch
					if (completedBatches > 0) {
						await new Promise((resolve) =>
							setTimeout(resolve, 1000)
						)
					}

					// Ưu tiên sinh cho chế độ hiện tại trước
					if (view === "flashcards" && remainingFlashcards > 0) {
						const count = Math.min(BATCH_SIZE, remainingFlashcards)

						try {
							// Gửi tất cả flashcard front để tránh duplicate
							const existingCards = currentFlashcards.cards

							const newCards = await safeAICall(() =>
								generateFlashcards({
									topic: currentTopic,
									count,
									language: currentLanguage,
									existingCards: existingCards,
								})
							)

							// Kiểm tra và validate response
							if (
								Array.isArray(newCards) &&
								newCards.length > 0 &&
								!signal.aborted &&
								isMountedRef.current
							) {
								currentFlashcards.cards.push(...newCards)
								await db.put("data", {
									id: "flashcards",
									topic: currentTopic,
									data: currentFlashcards,
								} as any)
								setFlashcardSet({ ...currentFlashcards })

								// Update generation state
								await saveGenerationState({
									topic: currentTopic,
									language: currentLanguage,
									isGenerating: true,
									startTime: Date.now(),
									targetFlashcards: flashcardMax,
									targetQuiz: quizMax,
									currentFlashcards:
										currentFlashcards.cards.length,
									currentQuiz: currentQuiz.questions.length,
								})

								console.log(
									`✅ Generated ${newCards.length} flashcards`
								)
							} else {
								console.warn(
									"⚠️ Invalid flashcards response:",
									newCards
								)
							}
						} catch (error: any) {
							console.error(
								"❌ Flashcard generation failed:",
								error.message
							)
							if (error.message === "AI_TIMEOUT") {
								toast({
									title: "Timeout",
									description:
										"AI generation quá lâu. Đang thử lại...",
									variant: "destructive",
								})
							}
						}

						remainingFlashcards -= count
						completedBatches++
						setGenerationProgress(
							(completedBatches / totalBatches) * 100
						)
					}

					if (view === "quiz" && remainingQuiz > 0) {
						const count = Math.min(BATCH_SIZE, remainingQuiz)

						try {
							// Gửi tất cả câu hỏi để tránh duplicate
							const existingQuestions = currentQuiz.questions

							const newQuestions = await safeAICall(() =>
								generateQuiz({
									topic: currentTopic,
									count,
									language: currentLanguage,
									existingQuestions: existingQuestions,
								})
							)

							if (
								Array.isArray(newQuestions) &&
								newQuestions.length > 0 &&
								!signal.aborted &&
								isMountedRef.current
							) {
								currentQuiz.questions.push(...newQuestions)
								await db.put("data", {
									id: "quiz",
									topic: currentTopic,
									data: currentQuiz,
								} as any)
								setQuizSet({ ...currentQuiz })

								// Update generation state
								await saveGenerationState({
									topic: currentTopic,
									language: currentLanguage,
									isGenerating: true,
									startTime: Date.now(),
									targetFlashcards: flashcardMax,
									targetQuiz: quizMax,
									currentFlashcards:
										currentFlashcards.cards.length,
									currentQuiz: currentQuiz.questions.length,
								})

								console.log(
									`✅ Generated ${newQuestions.length} quiz questions`
								)
							} else {
								console.warn(
									"⚠️ Invalid quiz response:",
									newQuestions
								)
							}
						} catch (error: any) {
							console.error(
								"❌ Quiz generation failed:",
								error.message
							)
							if (error.message === "AI_TIMEOUT") {
								toast({
									title: "Timeout",
									description:
										"AI generation quá lâu. Đang thử lại...",
									variant: "destructive",
								})
							}
						}

						remainingQuiz -= count
						completedBatches++
						setGenerationProgress(
							(completedBatches / totalBatches) * 100
						)
					}

					// Sau khi ưu tiên chế độ hiện tại, sinh phần còn lại nếu còn
					if (view === "flashcards" && remainingQuiz > 0) {
						const count = Math.min(BATCH_SIZE, remainingQuiz)

						try {
							const existingQuestions = currentQuiz.questions
							const newQuestions = await safeAICall(() =>
								generateQuiz({
									topic: currentTopic,
									count,
									language: currentLanguage,
									existingQuestions: existingQuestions,
								})
							)

							if (
								Array.isArray(newQuestions) &&
								newQuestions.length > 0 &&
								!signal.aborted &&
								isMountedRef.current
							) {
								currentQuiz.questions.push(...newQuestions)
								await db.put("data", {
									id: "quiz",
									topic: currentTopic,
									data: currentQuiz,
								} as any)
								setQuizSet({ ...currentQuiz })

								// Update generation state
								await saveGenerationState({
									topic: currentTopic,
									language: currentLanguage,
									isGenerating: true,
									startTime: Date.now(),
									targetFlashcards: flashcardMax,
									targetQuiz: quizMax,
									currentFlashcards:
										currentFlashcards.cards.length,
									currentQuiz: currentQuiz.questions.length,
								})
							}
						} catch (error: any) {
							console.error(
								"❌ Background quiz generation failed:",
								error.message
							)
						}

						remainingQuiz -= count
						completedBatches++
						setGenerationProgress(
							(completedBatches / totalBatches) * 100
						)
					}

					if (view === "quiz" && remainingFlashcards > 0) {
						const count = Math.min(BATCH_SIZE, remainingFlashcards)

						try {
							const existingCards = currentFlashcards.cards
							const newCards = await safeAICall(() =>
								generateFlashcards({
									topic: currentTopic,
									count,
									language: currentLanguage,
									existingCards: existingCards,
								})
							)

							if (
								Array.isArray(newCards) &&
								newCards.length > 0 &&
								!signal.aborted &&
								isMountedRef.current
							) {
								currentFlashcards.cards.push(...newCards)
								await db.put("data", {
									id: "flashcards",
									topic: currentTopic,
									data: currentFlashcards,
								} as any)
								setFlashcardSet({ ...currentFlashcards })

								// Update generation state
								await saveGenerationState({
									topic: currentTopic,
									language: currentLanguage,
									isGenerating: true,
									startTime: Date.now(),
									targetFlashcards: flashcardMax,
									targetQuiz: quizMax,
									currentFlashcards:
										currentFlashcards.cards.length,
									currentQuiz: currentQuiz.questions.length,
								})
							}
						} catch (error: any) {
							console.error(
								"❌ Background flashcard generation failed:",
								error.message
							)
						}

						remainingFlashcards -= count
						completedBatches++
						setGenerationProgress(
							(completedBatches / totalBatches) * 100
						)
					}
				}

				// Hoàn tất - chỉ cập nhật nếu component còn mounted
				if (!signal.aborted && isMountedRef.current) {
					setFlashcardSet({ ...currentFlashcards })
					setQuizSet({ ...currentQuiz })
				}
			} catch (error: any) {
				console.log("🚫 Generation bị hủy hoặc lỗi:", error.message)

				if (error.name === "AbortError") {
					console.log("✅ Generation đã được hủy thành công")
				} else {
					toast({
						title: "Lỗi tạo nội dung",
						description:
							"Có lỗi xảy ra khi tạo nội dung. Vui lòng thử lại.",
						variant: "destructive",
					})
				}
			} finally {
				// Clear generation state khi hoàn thành
				await clearGenerationState()
				console.log("✅ Generation completed, state cleared")

				isGeneratingRef.current = false
				setIsLoading(false)
				setGenerationProgress(0)
			}
		},
		[toast, flashcardMax, quizMax, view]
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

		// Check for interrupted generation
		const wasInterrupted = await checkInterruptedGeneration(
			savedTopic,
			savedLanguage
		)
		if (wasInterrupted) {
			// Show toast confirmation instead of alert
			toast({
				title: "🔄 Phát hiện quá trình tạo nội dung bị gián đoạn",
				description: `Chủ đề "${savedTopic}" chưa hoàn thành. Bạn có muốn tiếp tục tải thêm nội dung không?`,
				duration: 0, // Không tự động đóng
				action: (
					<div className="flex gap-2">
						<button
							className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
							onClick={async () => {
								toast({
									title: "Đang tiếp tục tạo nội dung...",
									description: "Vui lòng đợi trong giây lát",
								})
								handleGenerate(savedTopic, savedLanguage, false)
							}}
						>
							Tiếp tục
						</button>
						<button
							className="bg-gray-500 text-white px-3 py-1 rounded text-sm hover:bg-gray-600"
							onClick={async () => {
								await clearGenerationState()
								console.log(
									"🚫 User declined to continue interrupted generation"
								)
								toast({
									title: "Đã bỏ qua",
									description:
										"Quá trình tạo nội dung đã được hủy",
								})
							}}
						>
							Bỏ qua
						</button>
					</div>
				),
			})
		} else {
			// Normal check for needed content
			const flashcardsNeeded =
				savedFlashcardMax - (currentFlashcards?.cards.length ?? 0)
			const quizNeeded =
				savedQuizMax - (currentQuiz?.questions.length ?? 0)

			if (savedTopic && (flashcardsNeeded > 0 || quizNeeded > 0)) {
				handleGenerate(savedTopic, savedLanguage, false)
			}
		}
	}, [handleGenerate, toast])

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
				handleGenerate(newTopic, newLanguage, true)
			}
		},
		[topic, language, handleGenerate]
	)

	// Chỉ gọi handleGenerate khi thay đổi giới hạn số lượng
	useEffect(() => {
		if (topic && language && !isGeneratingRef.current) {
			// Đơn giản: chỉ check và generate nếu cần
			const checkAndGenerate = async () => {
				const db = await getDb()
				const flashcardData = (await db.get(
					"data",
					"flashcards"
				)) as LabeledData<FlashcardSet>
				const quizData = (await db.get(
					"data",
					"quiz"
				)) as LabeledData<QuizSet>

				const currentFlashcards =
					flashcardData?.topic === topic
						? flashcardData.data.cards.length
						: 0
				const currentQuiz =
					quizData?.topic === topic
						? quizData.data.questions.length
						: 0

				const needsFlashcards = currentFlashcards < flashcardMax
				const needsQuiz = currentQuiz < quizMax

				if (needsFlashcards || needsQuiz) {
					console.log(
						`🚀 Auto-generate needed - F:${needsFlashcards} Q:${needsQuiz}`
					)
					handleGenerate(topic, language, false)
				}
			}

			checkAndGenerate().catch(console.error)
		}
	}, [flashcardMax, quizMax, topic, language, handleGenerate])

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
			if (view === newView) return // Avoid infinite update loop
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

	const onGenerateNew = useCallback(
		(forceNew: boolean) => {
			handleGenerate(topic, language, forceNew)
		},
		[handleGenerate, topic, language]
	)

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

	const currentQuizAnswer =
		quizState?.answers?.[quizState.currentQuestionIndex]?.selected ?? null

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
		flashcardSet,
		quizSet,
		quizState,
		currentQuizAnswer,
		currentFlashcard,
	])

	const targetCount = view === "flashcards" ? flashcardMax : quizMax

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
							generationProgress={generationProgress}
							targetCount={targetCount}
							onQuizStateChange={handleQuizStateChange}
							flashcardIsRandom={flashcardIsRandom}
							onCurrentCardChange={handleCurrentCardChange}
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
