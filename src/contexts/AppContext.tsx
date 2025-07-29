

"use client"

import React, {
	createContext,
	useContext,
	useState,
	useEffect,
	useCallback,
	useRef,
	ReactNode,
} from "react"
import { useToast, clearAllToastTimeouts } from "@/hooks/use-toast"
import { getDb, LabeledData, AppData, DataKey, closeDb } from "@/lib/idb"
import { AIError } from "@/lib/ai-service"
import { generateFlashcards } from "@/ai/flows/generate-flashcards"
import { generateQuiz } from "@/ai/flows/generate-quiz"
import { generateTheoryOutline } from "@/ai/flows/generate-theory-outline"
import { generateTheoryChapter } from "@/ai/flows/generate-theory-chapter"
import { generatePodcastScript } from "@/ai/flows/generate-podcast-script"
import { generateAudio } from "@/ai/flows/generate-audio"
import type { CardSet, QuizSet, TheorySet } from "@/ai/schemas"
import type { QuizState, FlashcardState, TheoryState } from "@/app/types"

export interface ComponentVisibility {
	home: boolean
	clock: boolean
	greeting: boolean
	search: boolean
	quickLinks: boolean
	learn: boolean
	advancedVoiceChat: boolean
}

const FLASHCARDS_PER_CHAPTER = 5
const QUIZ_QUESTIONS_PER_CHAPTER = 4

interface AppContextType {
	// State
	isMounted: boolean
	isLoading: boolean
	isGeneratingPodcast: boolean
	backgroundImage: string
	visibility: ComponentVisibility
	hasCompletedOnboarding: boolean

	// Learning State
	view: "flashcards" | "quiz" | "theory"
	topic: string
	language: string
	model: string
	apiKeys: string[]
	apiKeyIndex: number

	// Datasets
	flashcardSet: CardSet | null
	quizSet: QuizSet | null
	theorySet: TheorySet | null

	// UI State for Learning components
	quizState: QuizState | null
	flashcardState: FlashcardState | null
	theoryState: TheoryState | null
	flashcardIndex: number
	currentQuestionIndex: number
	theoryChapterIndex: number
	showQuizSummary: boolean
	showFlashcardSummary: boolean
	showTheorySummary: boolean

	// Uploaded Backgrounds
	uploadedBackgrounds: string[]

	// State Setters & Handlers
	onViewChange: (view: "flashcards" | "quiz" | "theory") => void
	onFlashcardIndexChange: (index: number) => void
	onCurrentQuestionIndexChange: (index: number) => void
	onTheoryChapterIndexChange: (index: number) => void
	setShowQuizSummary: (show: boolean) => void
	setShowFlashcardSummary: (show: boolean) => void
	setShowTheorySummary: (show: boolean) => void
	handleGenerate: (forceNew: boolean) => void
	handleGeneratePodcastForChapter: (chapterIndex: number) => void
	onClearAllData: () => void
	onVisibilityChange: (visibility: ComponentVisibility) => void
	onBackgroundChange: (background: string | null) => void
	onUploadedBackgroundsChange: (backgrounds: string[]) => void
	onApiKeysChange: (apiKeys: string[]) => void
	handleApiKeyIndexChange: (index: number) => void
	onQuizStateChange: (newState: QuizState) => void
	onQuizReset: () => void
	onFlashcardStateChange: (newState: FlashcardState) => void
	onFlashcardReset: () => void
	onTheoryStateChange: (newState: TheoryState) => void
	onTheoryReset: () => void
	onOnboardingComplete: (
		topic: string,
		language: string,
		model: string
	) => void
	onSettingsSave: (settings: {
		topic: string
		language: string
		model: string
	}) => void
	handleClearLearningData: () => Promise<void>
	onGenerate: (forceNew: boolean) => void
	handleResetOnboarding: () => void
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export function useAppContext() {
	const context = useContext(AppContext)
	if (!context) {
		throw new Error("useAppContext must be used within an AppProvider")
	}
	return context
}

export function AppProvider({ children }: { children: ReactNode }) {
	// Global State
	const [isMounted, setIsMounted] = useState(false)
	const [isLoading, setIsLoading] = useState(false)
	const [isGeneratingPodcast, setIsGeneratingPodcast] = useState(false)
	const [backgroundImage, setBackgroundImage] = useState("")
	const [uploadedBackgrounds, setUploadedBackgrounds] = useState<string[]>([])
	const [visibility, setVisibility] = useState<ComponentVisibility>({
		home: true,
		clock: true,
		greeting: true,
		search: true,
		quickLinks: true,
		learn: true,
		advancedVoiceChat: true,
	})
	const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false)

	// Learning State
	const [view, setView] = useState<"flashcards" | "quiz" | "theory">("theory")
	const [topic, setTopic] = useState("Lịch sử La Mã")
	const [language, setLanguage] = useState("Vietnamese")
	const [model, setModel] = useState("gemini-1.5-flash-lite")
	const [apiKeys, setApiKeys] = useState<string[]>([])
	const [apiKeyIndex, setApiKeyIndex] = useState(0)

	// Data Sets
	const [flashcardSet, setFlashcardSet] = useState<CardSet | null>(null)
	const [quizSet, setQuizSet] = useState<QuizSet | null>(null)
	const [theorySet, setTheorySet] = useState<TheorySet | null>(null)

	// UI State for Learning
	const [quizState, setQuizState] = useState<QuizState | null>(null)
	const [flashcardState, setFlashcardState] = useState<FlashcardState | null>(
		null
	)
	const [theoryState, setTheoryState] = useState<TheoryState | null>(null)
	const [flashcardIndex, setFlashcardIndex] = useState(0)
	const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
	const [theoryChapterIndex, setTheoryChapterIndex] = useState(0)
	const [showQuizSummary, setShowQuizSummary] = useState(false)
	const [showFlashcardSummary, setShowFlashcardSummary] = useState(false)
	const [showTheorySummary, setShowTheorySummary] = useState(false)

	const { toast } = useToast()
	const isGeneratingRef = useRef(false)
	const isMountedRef = useRef(true)

	// --- Effects ---

	useEffect(() => {
		isMountedRef.current = true
		setIsMounted(true)
		loadInitialData()

		return () => {
			isMountedRef.current = false
			closeDb()
			clearAllToastTimeouts()
		}
	}, [])

	// --- Data Handling Callbacks ---

	const onClearAllData = useCallback(async () => {
		const db = await getDb()
		const keysToDelete: DataKey[] = [
			"flashcards",
			"flashcardState",
			"flashcardIndex",
			"quiz",
			"quizState",
			"theory",
			"theoryState",
			"theoryChapterIndex",
			"topic",
			"language",
			"model",
			"view",
			"visibility",
			"background",
			"uploadedBackgrounds",
			"apiKeys",
			"apiKeyIndex",
			"hasCompletedOnboarding",
		]

		const tx = db.transaction("data", "readwrite")
		const store = tx.objectStore("data")
		await Promise.all(keysToDelete.map((key) => store.delete(key)))
		await tx.done

		localStorage.removeItem("newtab-ai-layout-v2")

		// Reset state in memory
		setFlashcardSet(null)
		setFlashcardState({ understoodIndices: [] })
		setFlashcardIndex(0)
		setQuizSet(null)
		setQuizState({ currentQuestionIndex: 0, answers: {} })
		setCurrentQuestionIndex(0)
		setTheorySet(null)
		setTheoryState({ understoodIndices: [] })
		setTheoryChapterIndex(0)
		setShowFlashcardSummary(false)
		setShowQuizSummary(false)
		setShowTheorySummary(false)
		setTopic("Lịch sử La Mã")
		setLanguage("Vietnamese")
		setModel("gemini-1.5-flash-lite")
		setView("theory")
		setVisibility({
			home: true,
			clock: true,
			greeting: true,
			search: true,
			quickLinks: true,
			learn: true,
			advancedVoiceChat: true,
		})
		setBackgroundImage("")
		setUploadedBackgrounds([])
		setApiKeys([])
		setApiKeyIndex(0)
		setHasCompletedOnboarding(false)

		toast({
			title: "Đã xóa dữ liệu",
			description: "Toàn bộ dữ liệu ứng dụng đã được xóa.",
		})
	}, [toast])

	const handleClearLearningData = useCallback(async () => {
		const db = await getDb()
		const keysToDelete: DataKey[] = [
			"flashcards",
			"flashcardState",
			"flashcardIndex",
			"quiz",
			"quizState",
			"theory",
			"theoryState",
			"theoryChapterIndex",
		]

		const tx = db.transaction("data", "readwrite")
		const store = tx.objectStore("data")
		await Promise.all(keysToDelete.map((key) => store.delete(key)))
		await tx.done

		// Reset state in memory
		setFlashcardSet(null)
		setFlashcardState({ understoodIndices: [] })
		setFlashcardIndex(0)
		setQuizSet(null)
		setQuizState({ currentQuestionIndex: 0, answers: {} })
		setCurrentQuestionIndex(0)
		setTheorySet(null)
		setTheoryState({ understoodIndices: [] })
		setTheoryChapterIndex(0)
		setShowFlashcardSummary(false)
		setShowQuizSummary(false)
		setShowTheorySummary(false)

		toast({
			title: "Đã xóa dữ liệu học tập",
			description: "Toàn bộ dữ liệu học tập cho chủ đề cũ đã được xóa.",
		})
	}, [toast])

	const loadInitialData = useCallback(async () => {
		const db = await getDb()

		// Migration from single 'apiKey' to 'apiKeys'
		const oldApiKeyRes = await db.get("data", "apiKey" as any)
		if (oldApiKeyRes?.data && typeof oldApiKeyRes.data === "string") {
			await db.put("data", { id: "apiKeys", data: [oldApiKeyRes.data] })
			await db.delete("data", "apiKey" as any)
		}

		const [
			savedApiKeysRes,
			savedApiKeyIndexRes,
			savedViewRes,
			savedTopicRes,
			savedLanguageRes,
			savedModelRes,
			savedVisibilityRes,
			savedBgRes,
			savedUploadedBgsRes,
			flashcardDataRes,
			flashcardStateRes,
			quizDataRes,
			quizStateRes,
			theoryDataRes,
			theoryStateRes,
			onboardingStatusRes,
		] = await Promise.all([
			db.get("data", "apiKeys"),
			db.get("data", "apiKeyIndex"),
			db.get("data", "view"),
			db.get("data", "topic"),
			db.get("data", "language"),
			db.get("data", "model"),
			db.get("data", "visibility"),
			db.get("data", "background"),
			db.get("data", "uploadedBackgrounds"),
			db.get("data", "flashcards"),
			db.get("data", "flashcardState"),
			db.get("data", "quiz"),
			db.get("data", "quizState"),
			db.get("data", "theory"),
			db.get("data", "theoryState"),
			db.get("data", "hasCompletedOnboarding"),
		])

		const savedApiKeys = (savedApiKeysRes?.data as string[]) || []
		const savedApiKeyIndex = (savedApiKeyIndexRes?.data as number) || 0
		const savedView =
			(savedViewRes?.data as "flashcards" | "quiz" | "theory") || "theory"
		const savedTopic = (savedTopicRes?.data as string) || "Lịch sử La Mã"
		const savedLanguage = (savedLanguageRes?.data as string) || "Vietnamese"
		const savedModel =
			(savedModelRes?.data as string) || "gemini-1.5-flash-lite"
		const savedVisibility = savedVisibilityRes?.data as ComponentVisibility
		const savedBg = savedBgRes?.data as string
		const savedUploadedBgs = (savedUploadedBgsRes?.data as string[]) || []
		const onboardingCompleted =
			(onboardingStatusRes?.data as boolean) || false

		setHasCompletedOnboarding(onboardingCompleted)

		if (savedApiKeys) setApiKeys(savedApiKeys)
		setApiKeyIndex(
			savedApiKeyIndex < savedApiKeys.length ? savedApiKeyIndex : 0
		)
		if (savedBg) setBackgroundImage(savedBg)
		setUploadedBackgrounds(savedUploadedBgs)

		setView(savedView)
		setTopic(savedTopic)
		setLanguage(savedLanguage)
		setModel(savedModel)

		if (savedVisibility) {
			setVisibility(savedVisibility)
		}

		const flashcardData = flashcardDataRes as LabeledData<CardSet>
		const quizData = quizDataRes as LabeledData<QuizSet>
		const theoryData = theoryDataRes as LabeledData<TheorySet>
		const flashcardStateData = flashcardStateRes as AppData
		const quizStateData = quizStateRes as AppData
		const theoryStateData = theoryStateRes as AppData

		let currentFlashcards =
			flashcardData && flashcardData.topic === savedTopic
				? flashcardData.data
				: null

		let currentQuiz =
			quizData && quizData.topic === savedTopic ? quizData.data : null

		let currentTheory =
			theoryData && theoryData.topic === savedTopic
				? theoryData.data
				: null

		setFlashcardSet(currentFlashcards)
		setQuizSet(currentQuiz)
		setTheorySet(currentTheory)

		const currentFlashcardState =
			flashcardData &&
			flashcardData.topic === savedTopic &&
			flashcardStateData
				? (flashcardStateData.data as FlashcardState)
				: { understoodIndices: [] }
		setFlashcardState(currentFlashcardState)

		let initialFlashcardIndex = 0
		if (currentFlashcards && currentFlashcards.cards.length > 0) {
			const firstUnseenIndex = currentFlashcards.cards.findIndex(
				(_, index) =>
					!currentFlashcardState.understoodIndices.includes(index)
			)
			if (firstUnseenIndex !== -1) {
				initialFlashcardIndex = firstUnseenIndex
			}
		}
		setFlashcardIndex(initialFlashcardIndex)

		let currentQuizState: QuizState = {
			currentQuestionIndex: 0,
			answers: {},
		}
		if (quizData && quizData.topic === savedTopic && quizStateData) {
			currentQuizState = quizStateData.data as QuizState
		}

		if (currentQuiz && currentQuiz.questions.length > 0) {
			const firstUnansweredIndex = currentQuiz.questions.findIndex(
				(_, index) => !currentQuizState.answers[index]
			)
			if (firstUnansweredIndex !== -1) {
				currentQuizState.currentQuestionIndex = firstUnansweredIndex
			}
		}
		setQuizState(currentQuizState)
		setCurrentQuestionIndex(currentQuizState.currentQuestionIndex)

		const currentTheoryState =
			theoryData && theoryData.topic === savedTopic && theoryStateData
				? (theoryStateData.data as TheoryState)
				: { understoodIndices: [] }
		setTheoryState(currentTheoryState)

		let initialTheoryIndex = 0
		if (currentTheory && currentTheory.chapters.length > 0) {
			const firstUnseenIndex = currentTheory.chapters.findIndex(
				(_, index) =>
					!currentTheoryState.understoodIndices.includes(index)
			)
			if (firstUnseenIndex !== -1) {
				initialTheoryIndex = firstUnseenIndex
			}
		}
		setTheoryChapterIndex(initialTheoryIndex)
	}, [])

	// --- AI Generation Callbacks ---
	const handleApiKeyIndexChange = useCallback(
		async (index: number) => {
			if (apiKeyIndex === index) return
			setApiKeyIndex(index)
			const db = await getDb()
			await db.put("data", { id: "apiKeyIndex", data: index })
		},
		[apiKeyIndex]
	)

	const handleGenerate = useCallback(
		async (forceNew: boolean = false) => {
			if (!apiKeys || apiKeys.length === 0) {
				toast({
					title: "Thiếu API Key",
					description:
						"Vui lòng nhập API Key Gemini của bạn trong phần Cài đặt.",
					variant: "destructive",
				})
				return
			}

			if (!topic.trim()) {
				toast({
					title: "Chủ đề trống",
					description: "Vui lòng nhập một chủ đề để bắt đầu tạo.",
					variant: "destructive",
				})
				return
			}

			if (isGeneratingRef.current) {
				toast({
					title: "Đang tạo...",
					description: `Một quá trình tạo nội dung khác đang chạy.`,
				})
				return
			}

			isGeneratingRef.current = true
			setIsLoading(true)

			const db = await getDb()

			try {
				let currentTheorySet = theorySet
				let currentFlashcardSet = flashcardSet ?? {
					id: "idb-flashcards",
					topic,
					cards: [],
				}
				let currentQuizSet = quizSet ?? {
					id: "idb-quiz",
					topic,
					questions: [],
				}

				// Step 1: Handle new topic or forced reset
				if (forceNew || !currentTheorySet) {
					await handleClearLearningData() // Clear all learning data for the new topic

					// Generate Outline
					const { result: outlineResult, newApiKeyIndex } =
						await generateTheoryOutline({
							apiKeys,
							apiKeyIndex,
							topic,
							language,
							model,
						})
					handleApiKeyIndexChange(newApiKeyIndex)

					if (
						!outlineResult?.outline ||
						outlineResult.outline.length === 0
					) {
						throw new Error(
							"Failed to generate a valid theory outline."
						)
					}

					currentTheorySet = {
						id: "idb-theory",
						topic,
						outline: outlineResult.outline,
						chapters: outlineResult.outline.map((title) => ({
							title,
							content: null,
							podcastScript: null,
							audioDataUri: null,
						})),
					}
					currentFlashcardSet = {
						id: "idb-flashcards",
						topic,
						cards: [],
					}
					currentQuizSet = { id: "idb-quiz", topic, questions: [] }

					if (isMountedRef.current) {
						setTheorySet(currentTheorySet)
						setFlashcardSet(currentFlashcardSet)
						setQuizSet(currentQuizSet)
						setTheoryState({ understoodIndices: [] })
						setFlashcardState({ understoodIndices: [] })
						setQuizState({ currentQuestionIndex: 0, answers: {} })
						setTheoryChapterIndex(0)
						setFlashcardIndex(0)
						setCurrentQuestionIndex(0)
					}
					await db.put("data", {
						id: "theory",
						topic,
						data: currentTheorySet,
					})
					await db.put("data", {
						id: "flashcards",
						topic,
						data: currentFlashcardSet,
					})
					await db.put("data", {
						id: "quiz",
						topic,
						data: currentQuizSet,
					})
				}

				// Step 2: Sequential Generation Loop
				for (let i = 0; i < currentTheorySet.outline.length; i++) {
					if (!isMountedRef.current) break

					const chapter = currentTheorySet.chapters[i]

					// A. Generate Theory Content if it doesn't exist
					if (!chapter.content) {
						const { result: chapterResult, newApiKeyIndex } =
							await generateTheoryChapter({
								apiKeys,
								apiKeyIndex,
								topic,
								chapterTitle: chapter.title,
								language,
								model,
							})
						handleApiKeyIndexChange(newApiKeyIndex)

						if (chapterResult?.content) {
							currentTheorySet.chapters[i].content =
								chapterResult.content
							if (isMountedRef.current)
								setTheorySet({ ...currentTheorySet })
							await db.put("data", {
								id: "theory",
								topic,
								data: currentTheorySet,
							})
						} else {
							throw new Error(
								`Failed to generate content for chapter: ${chapter.title}`
							)
						}
					}

					const chapterContent = currentTheorySet.chapters[i].content!

					// B. Generate Flashcards for the chapter
					const { result: newCards, newApiKeyIndex: newKeyIndexFC } =
						await generateFlashcards({
							apiKeys,
							apiKeyIndex,
							topic,
							count: FLASHCARDS_PER_CHAPTER,
							language,
							model,
							existingCards: currentFlashcardSet.cards,
							theoryContent: `Chapter: ${chapter.title}\n\n${chapterContent}`,
						})
					handleApiKeyIndexChange(newKeyIndexFC)

					if (Array.isArray(newCards) && newCards.length > 0) {
						const cardsWithSource = newCards.map(card => ({...card, source: chapter.title}));
						currentFlashcardSet.cards.push(...cardsWithSource)
						if (isMountedRef.current)
							setFlashcardSet({ ...currentFlashcardSet })
						await db.put("data", {
							id: "flashcards",
							topic,
							data: currentFlashcardSet,
						})
					}

					// C. Generate Quiz questions for the chapter
					const {
						result: newQuestions,
						newApiKeyIndex: newKeyIndexQuiz,
					} = await generateQuiz({
						apiKeys,
						apiKeyIndex,
						topic,
						count: QUIZ_QUESTIONS_PER_CHAPTER,
						language,
						model,
						existingQuestions: currentQuizSet.questions,
						theoryContent: `Chapter: ${chapter.title}\n\n${chapterContent}`,
					})
					handleApiKeyIndexChange(newKeyIndexQuiz)

					if (
						Array.isArray(newQuestions) &&
						newQuestions.length > 0
					) {
						const questionsWithSource = newQuestions.map(q => ({...q, source: chapter.title}));
						currentQuizSet.questions.push(...questionsWithSource)
						if (isMountedRef.current)
							setQuizSet({ ...currentQuizSet })
						await db.put("data", {
							id: "quiz",
							topic,
							data: currentQuizSet,
						})
					}

					if (!isMountedRef.current) break
					await new Promise((resolve) => setTimeout(resolve, 500)) // Small delay
				}

				toast({
					title: "Hoàn tất!",
					description:
						"Tất cả nội dung cho chủ đề đã được tạo thành công.",
				})
			} catch (error: any) {
				console.error(`🚫 Generation process stopped or failed:`, error)
				if (error instanceof AIError) {
					toast({
						title: "Lỗi tạo nội dung",
						description: error.message,
						variant: "destructive",
					})
				} else {
					toast({
						title: "Lỗi không xác định",
						description: `Đã xảy ra lỗi khi tạo nội dung: ${error.message}. Vui lòng thử lại.`,
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
		[
			toast,
			apiKeys,
			apiKeyIndex,
			handleApiKeyIndexChange,
			topic,
			language,
			model,
			handleClearLearningData,
			theorySet,
			flashcardSet,
			quizSet,
		]
	)

	const handleGeneratePodcastForChapter = useCallback(
		async (chapterIndex: number) => {
			if (!theorySet || !theorySet.chapters[chapterIndex]?.content) {
				toast({
					title: "Thiếu nội dung",
					description: "Cần có nội dung lý thuyết để tạo podcast.",
					variant: "destructive",
				})
				return
			}
			if (isGeneratingRef.current || isGeneratingPodcast) {
				toast({
					title: "Đang bận",
					description: "Một quá trình tạo khác đang chạy.",
					variant: "destructive",
				})
				return
			}

			setIsGeneratingPodcast(true)
			isGeneratingRef.current = true // Block other generations

			const ttsModel = "gemini-1.5-flash-preview-tts"
			const db = await getDb()
			const chapter = theorySet.chapters[chapterIndex]

			try {
				let tempTheorySet = { ...theorySet }

				// Generate Script if it doesn't exist
				if (!chapter.podcastScript) {
					toast({
						title: "Đang tạo kịch bản...",
						description: `Bắt đầu tạo kịch bản cho chương "${chapter.title}".`,
					})
					const { result, newApiKeyIndex } =
						await generatePodcastScript({
							apiKeys,
							apiKeyIndex,
							topic,
							chapterTitle: chapter.title,
							theoryContent: chapter.content!,
							language,
							model,
						})
					handleApiKeyIndexChange(newApiKeyIndex)
					if (!result?.script)
						throw new Error("Không thể tạo kịch bản podcast.")

					tempTheorySet.chapters[chapterIndex].podcastScript =
						result.script
					if (isMountedRef.current) setTheorySet({ ...tempTheorySet })
					await db.put("data", {
						id: "theory",
						topic,
						data: tempTheorySet,
					})
				}

				// Generate Audio if it doesn't exist
				if (
					tempTheorySet.chapters[chapterIndex].podcastScript &&
					!tempTheorySet.chapters[chapterIndex].audioDataUri
				) {
					toast({
						title: "Đang tạo âm thanh...",
						description: `Bắt đầu tạo file âm thanh cho chương "${chapter.title}".`,
					})
					const { result, newApiKeyIndex } = await generateAudio({
						apiKeys,
						apiKeyIndex,
						script: tempTheorySet.chapters[chapterIndex]
							.podcastScript!,
						model: ttsModel,
					})
					handleApiKeyIndexChange(newApiKeyIndex)
					if (!result?.audioDataUri)
						throw new Error("Không thể tạo file âm thanh podcast.")

					tempTheorySet.chapters[chapterIndex].audioDataUri =
						result.audioDataUri
					if (isMountedRef.current) setTheorySet({ ...tempTheorySet })
					await db.put("data", {
						id: "theory",
						topic: topic,
						data: tempTheorySet,
					})
				}

				toast({
					title: "Hoàn tất!",
					description: `Podcast cho chương "${chapter.title}" đã được tạo.`,
				})
			} catch (error: any) {
				console.error(
					`🚫 Lỗi tạo podcast cho chương ${chapterIndex}:`,
					error
				)
				if (error instanceof AIError) {
					toast({
						title: "Lỗi tạo podcast",
						description: error.message,
						variant: "destructive",
					})
				} else {
					toast({
						title: "Lỗi không xác định",
						description: `Đã xảy ra lỗi: ${error.message}.`,
						variant: "destructive",
					})
				}
			} finally {
				setIsGeneratingPodcast(false)
				isGeneratingRef.current = false
			}
		},
		[
			theorySet,
			topic,
			language,
			model,
			apiKeys,
			apiKeyIndex,
			handleApiKeyIndexChange,
			toast,
			isGeneratingPodcast,
		]
	)

	// --- Settings Callbacks ---

	const onApiKeysChange = useCallback(
		async (newApiKeys: string[]) => {
			setApiKeys(newApiKeys)
			const currentKeyIndex =
				apiKeyIndex >= newApiKeys.length ? 0 : apiKeyIndex
			setApiKeyIndex(currentKeyIndex)
			const db = await getDb()
			await db.put("data", { id: "apiKeys", data: newApiKeys })
			await db.put("data", { id: "apiKeyIndex", data: currentKeyIndex })
		},
		[apiKeyIndex]
	)

	const onBackgroundChange = useCallback(
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

	const onUploadedBackgroundsChange = useCallback(
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

	const onVisibilityChange = useCallback(
		async (newVisibility: ComponentVisibility) => {
			setVisibility(newVisibility)
			const db = await getDb()
			await db.put("data", { id: "visibility", data: newVisibility })
		},
		[]
	)

	// --- Learning UI Callbacks ---
	const onViewChange = useCallback(
		async (newView: "flashcards" | "quiz" | "theory") => {
			if (view === newView) return
			setView(newView)
			setShowQuizSummary(false) // Hide summary when switching views
			setShowFlashcardSummary(false)
			setShowTheorySummary(false)
			const db = await getDb()
			await db.put("data", { id: "view", data: newView })
		},
		[view]
	)

	const onFlashcardIndexChange = useCallback(async (index: number) => {
		setFlashcardIndex(index)
		const db = await getDb()
		await db.put("data", { id: "flashcardIndex", data: index })
	}, [])

	const onCurrentQuestionIndexChange = useCallback(
		(index: number) => {
			setCurrentQuestionIndex(index)
			if (quizState) {
				const newState = { ...quizState, currentQuestionIndex: index }
				setQuizState(newState)
				// Debounce or directly write to DB
				const db = getDb()
				db.then((d) =>
					d.put("data", { id: "quizState", data: newState })
				)
			}
		},
		[quizState]
	)

	const onTheoryChapterIndexChange = useCallback(async (index: number) => {
		setTheoryChapterIndex(index)
		const db = await getDb()
		await db.put("data", { id: "theoryChapterIndex", data: index })
	}, [])

	const onQuizStateChange = useCallback(async (newState: QuizState) => {
		setQuizState(newState)
		const db = await getDb()
		await db.put("data", { id: "quizState", data: newState })
	}, [])

	const onQuizReset = useCallback(async () => {
		const newQuizState: QuizState = {
			currentQuestionIndex: 0,
			answers: {},
		}
		setQuizState(newQuizState)
		setCurrentQuestionIndex(0)
		setShowQuizSummary(false)

		const db = await getDb()
		await db.put("data", { id: "quizState", data: newQuizState })

		toast({
			title: "Bắt đầu lại",
			description: "Bạn có thể bắt đầu lại bài trắc nghiệm.",
		})
	}, [toast])

	const onFlashcardStateChange = useCallback(
		async (newState: FlashcardState) => {
			setFlashcardState(newState)
			const db = await getDb()
			await db.put("data", { id: "flashcardState", data: newState })
		},
		[]
	)

	const onFlashcardReset = useCallback(async () => {
		const newFlashcardState: FlashcardState = {
			understoodIndices: [],
		}
		setFlashcardState(newFlashcardState)
		setShowFlashcardSummary(false)
		setFlashcardIndex(0) // Go back to the first card

		const db = await getDb()
		await db.put("data", { id: "flashcardState", data: newFlashcardState })
		await db.put("data", { id: "flashcardIndex", data: 0 })

		toast({
			title: "Bắt đầu lại",
			description: "Bạn có thể bắt đầu lại bộ thẻ này.",
		})
	}, [toast])

	const onTheoryStateChange = useCallback(async (newState: TheoryState) => {
		setTheoryState(newState)
		const db = await getDb()
		await db.put("data", { id: "theoryState", data: newState })
	}, [])

	const onTheoryReset = useCallback(async () => {
		const newTheoryState: TheoryState = {
			understoodIndices: [],
		}
		setTheoryState(newTheoryState)
		setShowTheorySummary(false)
		setTheoryChapterIndex(0)

		const db = await getDb()
		await db.put("data", { id: "theoryState", data: newTheoryState })
		await db.put("data", { id: "theoryChapterIndex", data: 0 })

		toast({
			title: "Bắt đầu lại",
			description: "Bạn có thể bắt đầu lại phần lý thuyết.",
		})
	}, [toast])

	// --- Onboarding Callbacks ---

	const onOnboardingComplete = useCallback(
		async (
			finalTopic: string,
			finalLanguage: string,
			finalModel: string
		) => {
			setTopic(finalTopic)
			setLanguage(finalLanguage)
			setModel(finalModel)
			setHasCompletedOnboarding(true)
			const db = await getDb()
			await db.put("data", { id: "topic", data: finalTopic })
			await db.put("data", { id: "language", data: finalLanguage })
			await db.put("data", { id: "model", data: finalModel })
			await db.put("data", { id: "hasCompletedOnboarding", data: true })
		},
		[]
	)

	const onSettingsSave = useCallback(
		async (settings: { topic: string; language: string, model: string }) => {
			setTopic(settings.topic)
			setLanguage(settings.language)
			setModel(settings.model)
			const db = await getDb()
			await db.put("data", { id: "topic", data: settings.topic })
			await db.put("data", { id: "language", data: settings.language })
			await db.put("data", { id: "model", data: settings.model })
		},
		[]
	)

	const handleResetOnboarding = useCallback(async () => {
		await handleClearLearningData()
		const db = await getDb()
		await db.put("data", { id: "hasCompletedOnboarding", data: false })
		setHasCompletedOnboarding(false)
		window.location.reload()
	}, [handleClearLearningData])

	const onGenerate = useCallback(
		(forceNew: boolean) => {
			handleGenerate(forceNew)
		},
		[handleGenerate]
	)

	const value: AppContextType = {
		isMounted,
		isLoading,
		isGeneratingPodcast,
		backgroundImage,
		visibility,
		hasCompletedOnboarding,
		view,
		topic,
		language,
		model,
		apiKeys,
		apiKeyIndex,
		flashcardSet,
		quizSet,
		theorySet,
		quizState,
		flashcardState,
		theoryState,
		flashcardIndex,
		currentQuestionIndex,
		theoryChapterIndex,
		showQuizSummary,
		showFlashcardSummary,
		showTheorySummary,
		uploadedBackgrounds,
		onViewChange,
		onFlashcardIndexChange,
		onCurrentQuestionIndexChange,
		onTheoryChapterIndexChange,
		setShowQuizSummary,
		setShowFlashcardSummary,
		setShowTheorySummary,
		handleGenerate,
		handleGeneratePodcastForChapter,
		onClearAllData,
		onVisibilityChange,
		onBackgroundChange,
		onUploadedBackgroundsChange,
		onApiKeysChange,
		handleApiKeyIndexChange,
		onQuizStateChange,
		onQuizReset,
		onFlashcardStateChange,
		onFlashcardReset,
		onTheoryStateChange,
		onTheoryReset,
		onOnboardingComplete,
		onSettingsSave,
		handleClearLearningData,
		onGenerate,
		handleResetOnboarding,
	}

	return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
