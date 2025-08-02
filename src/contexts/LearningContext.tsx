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
import { useToast } from "@/hooks/use-toast"
import { useFirebaseData } from "@/hooks/use-firebase-data"
import * as api from "@/services/api";
import type {
	CardSet,
	QuizSet,
	TheorySet,
	GenerationJob,
} from "@/ai/schemas"
import type { QuizState, FlashcardState, TheoryState } from "@/app/types"
import { useSettingsContext } from "./SettingsContext"
import { useAuthContext } from "./AuthContext"

interface PersonalizationOptions {
    knowledgeLevel: string;
    learningGoal: string;
    learningStyle: string;
    tone: string;
}

interface GenerateOptions {
    forceNew: boolean;
    personalization?: PersonalizationOptions;
}

interface LearningContextType {
	// State
	isLoading: boolean
	isGeneratingPodcast: boolean
	generationJobId: string | null
	generationStatus: string | null

	// Learning State
	view: "flashcards" | "quiz" | "theory"
	topic: string
	language: string
	model: string

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

	// State Setters & Handlers
	onViewChange: (view: "flashcards" | "quiz" | "theory") => void
	onFlashcardIndexChange: (index: number) => void
	onCurrentQuestionIndexChange: (index: number) => void
	onTheoryChapterIndexChange: (index: number) => void
	setShowQuizSummary: (show: boolean) => void
	setShowFlashcardSummary: (show: boolean) => void
	setShowTheorySummary: (show: boolean) => void
	handleGenerate: (options: GenerateOptions) => void
	handleGeneratePodcastForChapter: (chapterIndex: number) => void
	onQuizStateChange: (newState: QuizState) => void
	onQuizReset: () => void
	onFlashcardStateChange: (newState: FlashcardState) => void
	onFlashcardReset: () => void
	onTheoryStateChange: (newState: TheoryState) => void
	onTheoryReset: () => void
	onSettingsSave: (settings: {
		topic: string
		language: string
		model: string
	}) => void
	handleClearLearningData: () => Promise<void>
	onGenerate: (options: GenerateOptions) => void
	handleCloneTopic: (publicTopicId: string) => Promise<void>;
}

const LearningContext = createContext<LearningContextType | undefined>(
	undefined
)

export function useLearningContext() {
	const context = useContext(LearningContext)
	if (!context) {
		throw new Error(
			"useLearningContext must be used within a LearningProvider"
		)
	}
	return context
}

export function LearningProvider({ children }: { children: ReactNode }) {
	const { user } = useAuthContext()
	const { setHasCompletedOnboarding } = useSettingsContext()
	const { toast } = useToast()
	const { saveData, getData, saveMultipleData, isLoading: dataLoading } = useFirebaseData()

	// State
	const [isLoading, setIsLoading] = useState(true)
	const [isGeneratingPodcast, setIsGeneratingPodcast] = useState(false)
	const [generationJobId, setGenerationJobId] = useState<string | null>(null)
	const [generationStatus, setGenerationStatus] = useState<string | null>(null)

	// Learning State
	const [view, setView] = useState<"flashcards" | "quiz" | "theory">("theory")
	const [topic, setTopic] = useState("")
	const [language, setLanguage] = useState("")
	const [model, setModel] = useState("")

	// Datasets
	const [flashcardSet, setFlashcardSet] = useState<CardSet | null>(null)
	const [quizSet, setQuizSet] = useState<QuizSet | null>(null)
	const [theorySet, setTheorySet] = useState<TheorySet | null>(null)

	// UI State for Learning components
	const [quizState, setQuizState] = useState<QuizState | null>(null)
	const [flashcardState, setFlashcardState] = useState<FlashcardState | null>(null)
	const [theoryState, setTheoryState] = useState<TheoryState | null>(null)
	const [flashcardIndex, setFlashcardIndex] = useState(0)
	const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
	const [theoryChapterIndex, setTheoryChapterIndex] = useState(0)
	const [showQuizSummary, setShowQuizSummary] = useState(false)
	const [showFlashcardSummary, setShowFlashcardSummary] = useState(false)
	const [showTheorySummary, setShowTheorySummary] = useState(false)

	const isPollingRef = useRef(false)
	const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)

	// Load initial data from Firebase
	const loadInitialData = useCallback(async () => {
		if (!user?.uid) return

		try {
			setIsLoading(true)

			// Load from Firebase
			const [
				savedView,
				savedTopic,
				savedLanguage,
				savedModel,
				savedFlashcards,
				savedQuiz,
				savedTheory,
				savedFlashcardState,
				savedQuizState,
				savedTheoryState,
				savedFlashcardIndex,
				savedCurrentQuestionIndex,
				savedTheoryChapterIndex,
			] = await Promise.all([
				getData("view") as Promise<"flashcards" | "quiz" | "theory" | null>,
				getData("topic") as Promise<string | null>,
				getData("language") as Promise<string | null>,
				getData("model") as Promise<string | null>,
				getData("flashcards") as Promise<CardSet | null>,
				getData("quiz") as Promise<QuizSet | null>,
				getData("theory") as Promise<TheorySet | null>,
				getData("flashcardState") as Promise<FlashcardState | null>,
				getData("quizState") as Promise<QuizState | null>,
				getData("theoryState") as Promise<TheoryState | null>,
				getData("flashcardIndex") as Promise<number | null>,
				getData("currentQuestionIndex") as Promise<number | null>,
				getData("theoryChapterIndex") as Promise<number | null>,
			])

			// Set state from Firebase data
			if (savedView) setView(savedView)
			if (savedTopic) setTopic(savedTopic)
			if (savedLanguage) setLanguage(savedLanguage)
			if (savedModel) setModel(savedModel)
			if (savedFlashcards) setFlashcardSet(savedFlashcards)
			if (savedQuiz) setQuizSet(savedQuiz)
			if (savedTheory) setTheorySet(savedTheory)
			if (savedFlashcardState) setFlashcardState(savedFlashcardState)
			if (savedQuizState) setQuizState(savedQuizState)
			if (savedTheoryState) setTheoryState(savedTheoryState)
			if (savedFlashcardIndex !== null) setFlashcardIndex(savedFlashcardIndex)
			if (savedCurrentQuestionIndex !== null) setCurrentQuestionIndex(savedCurrentQuestionIndex)
			if (savedTheoryChapterIndex !== null) setTheoryChapterIndex(savedTheoryChapterIndex)

		} catch (error) {
			console.error("Error loading learning data:", error)
			toast({
				title: "Lỗi tải dữ liệu",
				description: "Không thể tải dữ liệu học tập.",
				variant: "destructive",
			})
		} finally {
			setIsLoading(false)
		}
	}, [user?.uid, getData, toast])

	// Load data when user is available
	useEffect(() => {
		if (user !== undefined) {
			loadInitialData()
		}
	}, [user, loadInitialData])

	// Save functions
	const saveView = useCallback(async (newView: "flashcards" | "quiz" | "theory") => {
		try {
			await saveData("view", newView)
		} catch (error) {
			console.error("Error saving view:", error)
		}
	}, [saveData])

	const saveSettings = useCallback(async (settings: { topic: string; language: string; model: string }) => {
		try {
			await saveMultipleData({
				topic: settings.topic,
				language: settings.language,
				model: settings.model,
			})
		} catch (error) {
			console.error("Error saving settings:", error)
			toast({
				title: "Lỗi lưu cài đặt",
				description: "Không thể lưu cài đặt học tập.",
				variant: "destructive",
			})
		}
	}, [saveMultipleData, toast])

	// Event handlers
	const onViewChange = useCallback(async (newView: "flashcards" | "quiz" | "theory") => {
		setView(newView)
		await saveView(newView)
	}, [saveView])

	const onFlashcardIndexChange = useCallback(async (index: number) => {
		setFlashcardIndex(index)
		try {
			await saveData("flashcardIndex", index)
		} catch (error) {
			console.error("Error saving flashcard index:", error)
		}
	}, [saveData])

	const onCurrentQuestionIndexChange = useCallback(async (index: number) => {
		setCurrentQuestionIndex(index)
		try {
			await saveData("currentQuestionIndex", index)
		} catch (error) {
			console.error("Error saving question index:", error)
		}
	}, [saveData])

	const onTheoryChapterIndexChange = useCallback(async (index: number) => {
		setTheoryChapterIndex(index)
		try {
			await saveData("theoryChapterIndex", index)
		} catch (error) {
			console.error("Error saving chapter index:", error)
		}
	}, [saveData])

	const onQuizStateChange = useCallback(async (newState: QuizState) => {
		setQuizState(newState)
		try {
			await saveData("quizState", newState)
		} catch (error) {
			console.error("Error saving quiz state:", error)
		}
	}, [saveData])

	const onFlashcardStateChange = useCallback(async (newState: FlashcardState) => {
		setFlashcardState(newState)
		try {
			await saveData("flashcardState", newState)
		} catch (error) {
			console.error("Error saving flashcard state:", error)
		}
	}, [saveData])

	const onTheoryStateChange = useCallback(async (newState: TheoryState) => {
		setTheoryState(newState)
		try {
			await saveData("theoryState", newState)
		} catch (error) {
			console.error("Error saving theory state:", error)
		}
	}, [saveData])

	const onQuizReset = useCallback(async () => {
		setQuizState(null)
		setCurrentQuestionIndex(0)
		try {
			await saveMultipleData({
				quizState: null,
				currentQuestionIndex: 0,
			})
		} catch (error) {
			console.error("Error resetting quiz:", error)
		}
	}, [saveMultipleData])

	const onFlashcardReset = useCallback(async () => {
		setFlashcardState(null)
		setFlashcardIndex(0)
		try {
			await saveMultipleData({
				flashcardState: null,
				flashcardIndex: 0,
			})
		} catch (error) {
			console.error("Error resetting flashcards:", error)
		}
	}, [saveMultipleData])

	const onTheoryReset = useCallback(async () => {
		setTheoryState(null)
		setTheoryChapterIndex(0)
		try {
			await saveMultipleData({
				theoryState: null,
				theoryChapterIndex: 0,
			})
		} catch (error) {
			console.error("Error resetting theory:", error)
		}
	}, [saveMultipleData])

	const onSettingsSave = useCallback(async (settings: { topic: string; language: string; model: string }) => {
		setTopic(settings.topic)
		setLanguage(settings.language)
		setModel(settings.model)
		await saveSettings(settings)
	}, [saveSettings])

	// Generation handlers
	const handleGenerate = useCallback(async (options: GenerateOptions) => {
		if (!topic || !language || !model) {
			toast({
				title: "Thiếu thông tin",
				description: "Vui lòng hoàn thành thiết lập trước khi tạo nội dung.",
				variant: "destructive",
			})
			return
		}

		try {
			setIsLoading(true)
			
			// Call API to start generation job
			const response = await api.startGenerationJob({
				topic,
				language,
				knowledgeLevel: options.personalization?.knowledgeLevel || "intermediate",
				learningGoal: options.personalization?.learningGoal || "general",
				learningStyle: options.personalization?.learningStyle || "visual",
				tone: options.personalization?.tone || "friendly",
			})

			setGenerationJobId(response.jobId)
			setGenerationStatus("processing")

			// Poll for job completion
			const pollInterval = setInterval(async () => {
				try {
					const statusResponse = await api.getJobStatus(response.jobId)
					setGenerationStatus(statusResponse.data.status)

					if (statusResponse.data.status === "completed" && statusResponse.data.result) {
						clearInterval(pollInterval)
						
						// Save generated content to Firebase
						await saveMultipleData({
							flashcards: statusResponse.data.result.flashcards,
							quiz: statusResponse.data.result.quiz,
							theory: statusResponse.data.result.theory,
						})

						// Update local state
						setFlashcardSet(statusResponse.data.result.flashcards)
						setQuizSet(statusResponse.data.result.quiz)
						setTheorySet(statusResponse.data.result.theory)

						toast({
							title: "Tạo nội dung thành công",
							description: "Nội dung học tập đã được tạo.",
						})
						
						setIsLoading(false)
					} else if (statusResponse.data.status === "failed") {
						clearInterval(pollInterval)
						setIsLoading(false)
						toast({
							title: "Lỗi tạo nội dung",
							description: statusResponse.data.error || "Không thể tạo nội dung học tập.",
							variant: "destructive",
						})
					}
				} catch (error) {
					console.error("Error polling job status:", error)
				}
			}, 2000)

		} catch (error) {
			console.error("Error generating content:", error)
			setIsLoading(false)
			toast({
				title: "Lỗi tạo nội dung",
				description: "Không thể bắt đầu tạo nội dung học tập.",
				variant: "destructive",
			})
		}
	}, [topic, language, model, saveMultipleData, toast])

	const handleGeneratePodcastForChapter = useCallback(async (chapterIndex: number) => {
		if (!theorySet?.chapters[chapterIndex]) {
			toast({
				title: "Lỗi",
				description: "Chương không tồn tại.",
				variant: "destructive",
			})
			return
		}

		const chapter = theorySet.chapters[chapterIndex]
		if (!chapter.content) {
			toast({
				title: "Lỗi",
				description: "Nội dung chương không có sẵn.",
				variant: "destructive",
			})
			return
		}

		try {
			setIsGeneratingPodcast(true)
			
			// Call API to generate podcast script
			const response = await api.generatePodcastScript({
				topic,
				chapterTitle: chapter.title,
				theoryContent: chapter.content,
				language,
			})

			// The podcast script API returns immediately with the script
			toast({
				title: "Podcast script đã sẵn sàng",
				description: "Script podcast cho chương này đã được tạo.",
			})
			
			setIsGeneratingPodcast(false)

		} catch (error) {
			console.error("Error generating podcast:", error)
			setIsGeneratingPodcast(false)
			toast({
				title: "Lỗi tạo podcast",
				description: "Không thể tạo podcast script.",
				variant: "destructive",
			})
		}
	}, [theorySet, language, toast])

	const handleCloneTopic = useCallback(async (publicTopicId: string) => {
		try {
			setIsLoading(true)
			
			const response = await api.clonePublicTopic({ publicTopicId })
			
			toast({
				title: "Sao chép thành công",
				description: response.message || "Chủ đề đã được sao chép vào tài khoản của bạn.",
			})

		} catch (error) {
			console.error("Error cloning topic:", error)
			toast({
				title: "Lỗi sao chép",
				description: "Không thể sao chép chủ đề.",
				variant: "destructive",
			})
		} finally {
			setIsLoading(false)
		}
	}, [toast])

	const handleClearLearningData = useCallback(async () => {
		try {
			const learningKeys = [
				"flashcards", "flashcardState", "flashcardIndex", 
				"quiz", "quizState", "currentQuestionIndex",
				"theory", "theoryState", "theoryChapterIndex", 
				"topic", "language", "model", "view"
			]

			// Clear data from Firebase
			await saveMultipleData(Object.fromEntries(learningKeys.map(key => [key, null])))

			// Reset local state
			setFlashcardSet(null)
			setQuizSet(null)
			setTheorySet(null)
			setFlashcardState(null)
			setQuizState(null)
			setTheoryState(null)
			setFlashcardIndex(0)
			setCurrentQuestionIndex(0)
			setTheoryChapterIndex(0)
			setTopic("")
			setLanguage("")
			setModel("")
			setView("flashcards")

			toast({
				title: "Đã xóa dữ liệu",
				description: "Tất cả dữ liệu học tập đã được xóa.",
			})

		} catch (error) {
			console.error("Error clearing learning data:", error)
			toast({
				title: "Lỗi xóa dữ liệu",
				description: "Không thể xóa dữ liệu học tập.",
				variant: "destructive",
			})
		}
	}, [saveMultipleData, toast])

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			if (pollingIntervalRef.current) {
				clearInterval(pollingIntervalRef.current)
			}
		}
	}, [])

	const value: LearningContextType = {
		// State
		isLoading: isLoading || dataLoading,
		isGeneratingPodcast,
		generationJobId,
		generationStatus,

		// Learning State
		view,
		topic,
		language,
		model,

		// Datasets
		flashcardSet,
		quizSet,
		theorySet,

		// UI State
		quizState,
		flashcardState,
		theoryState,
		flashcardIndex,
		currentQuestionIndex,
		theoryChapterIndex,
		showQuizSummary,
		showFlashcardSummary,
		showTheorySummary,

		// Handlers
		onViewChange,
		onFlashcardIndexChange,
		onCurrentQuestionIndexChange,
		onTheoryChapterIndexChange,
		setShowQuizSummary,
		setShowFlashcardSummary,
		setShowTheorySummary,
		handleGenerate,
		handleGeneratePodcastForChapter,
		onQuizStateChange,
		onQuizReset,
		onFlashcardStateChange,
		onFlashcardReset,
		onTheoryStateChange,
		onTheoryReset,
		onSettingsSave,
		handleClearLearningData,
		onGenerate: handleGenerate,
		handleCloneTopic,
	}

	return (
		<LearningContext.Provider value={value}>
			{children}
		</LearningContext.Provider>
	)
}
