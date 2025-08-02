
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
	handleGenerate: (options: GenerateOptions & { 
		topic?: string; 
		language?: string; 
		model?: string;
	}) => void
	handleGeneratePodcastForChapter: (chapterIndex: number) => void
	refreshData: () => Promise<void>
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
	onGenerate: (options: GenerateOptions & { 
		topic?: string; 
		language?: string; 
		model?: string;
	}) => void
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
		if (!user?.uid) {
			console.log("❌ loadInitialData: No user.uid");
			return;
		}

		console.log("🚀 loadInitialData started for user:", user.uid);
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
			console.log("📦 Firebase data loaded:", {
				savedView,
				savedTopic,
				savedLanguage,
				savedModel,
				savedFlashcards: savedFlashcards ? "exists" : "null",
				savedQuiz: savedQuiz ? "exists" : "null", 
				savedTheory: savedTheory ? "exists" : "null",
				theoryChaptersCount: savedTheory?.chapters?.length || 0
			});
			
			// Debug actual data structure
			console.log("🔍 Detailed Firebase data analysis:");
			console.log("savedFlashcards type:", typeof savedFlashcards);
			console.log("savedFlashcards structure:", savedFlashcards);
			if (savedFlashcards) {
				console.log("savedFlashcards first item:", (savedFlashcards as any)[0]);
				console.log("savedFlashcards is array:", Array.isArray(savedFlashcards));
			}
			console.log("savedQuiz type:", typeof savedQuiz);
			console.log("savedQuiz structure:", savedQuiz);
			if (savedQuiz) {
				console.log("savedQuiz first item:", (savedQuiz as any)[0]);
				console.log("savedQuiz is array:", Array.isArray(savedQuiz));
			}
			console.log("savedTheory type:", typeof savedTheory);
			console.log("savedTheory structure:", savedTheory);
			if (savedTheory) {
				console.log("savedTheory first item:", (savedTheory as any)[0]);
				console.log("savedTheory is array:", Array.isArray(savedTheory));
			}
			
			// Transform data if needed
			let transformedFlashcards = null;
			let transformedQuiz = null;
			let transformedTheory = null;
			
			if (savedFlashcards) {
				if (Array.isArray(savedFlashcards)) {
					// Transform array to CardSet structure
					transformedFlashcards = {
						id: `flashcards-${savedTopic || 'unknown'}`,
						topic: savedTopic || 'Unknown Topic',
						cards: savedFlashcards
					};
					console.log("🔄 Transformed flashcards from array to CardSet");
				} else {
					transformedFlashcards = savedFlashcards;
				}
			}
			
			if (savedQuiz) {
				if (Array.isArray(savedQuiz)) {
					// Transform array to QuizSet structure
					transformedQuiz = {
						id: `quiz-${savedTopic || 'unknown'}`,
						topic: savedTopic || 'Unknown Topic',
						questions: savedQuiz
					};
					console.log("🔄 Transformed quiz from array to QuizSet");
				} else {
					transformedQuiz = savedQuiz;
				}
			}
			
			if (savedTheory) {
				if (Array.isArray(savedTheory)) {
					// Transform array to TheorySet structure
					transformedTheory = {
						id: `theory-${savedTopic || 'unknown'}`,
						topic: savedTopic || 'Unknown Topic',
						outline: savedTheory.map((chapter: any) => chapter.title || `Chapter ${chapter.id || chapter.order}`),
						chapters: savedTheory
					};
					console.log("🔄 Transformed theory from array to TheorySet");
				} else {
					transformedTheory = savedTheory;
				}
			}
			
			if (savedView) setView(savedView)
			if (savedTopic) setTopic(savedTopic)
			if (savedLanguage) setLanguage(savedLanguage)
			if (savedModel) setModel(savedModel)
			if (transformedFlashcards) setFlashcardSet(transformedFlashcards)
			if (transformedQuiz) setQuizSet(transformedQuiz)
			if (transformedTheory) setTheorySet(transformedTheory)
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

	// Manual data refresh for debugging
	const refreshData = useCallback(async () => {
		console.log("🔄 Manual refresh data triggered");
		await loadInitialData();
	}, [loadInitialData]);

	// Load data when user is available
	useEffect(() => {
		if (user !== undefined) {
			loadInitialData()
		}
	}, [user, loadInitialData])

	// Initialize quiz state when quiz set is available but state is null
	useEffect(() => {
		if (quizSet && !quizState && quizSet.questions && quizSet.questions.length > 0) {
			console.log("🎯 Initializing empty quiz state for quizSet:", quizSet);
			const initialQuizState: QuizState = {
				currentQuestionIndex: 0,
				answers: {},
			};
			setQuizState(initialQuizState);
		}
	}, [quizSet, quizState]);

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
	const handleGenerate = useCallback(async (options: GenerateOptions & { 
		topic?: string; 
		language?: string; 
		model?: string;
	}) => {
		// Use passed parameters or current state
		const currentTopic = options.topic || topic;
		const currentLanguage = options.language || language;
		const currentModel = options.model || model;
		
		console.log("🚀 Starting generation with:", {
			currentTopic,
			currentLanguage, 
			currentModel,
			options
		});
		
		if (!currentTopic || !currentLanguage || !currentModel) {
			console.log("❌ Missing required parameters");
			toast({
				title: "Thiếu thông tin",
				description: "Vui lòng hoàn thành thiết lập trước khi tạo nội dung.",
				variant: "destructive",
			})
			return
		}

		try {
			setIsLoading(true)
			
			// Update local state if parameters are passed
			if (options.topic && options.topic !== topic) setTopic(options.topic);
			if (options.language && options.language !== language) setLanguage(options.language);
			if (options.model && options.model !== model) setModel(options.model);
			
			console.log("📡 Calling startGenerationJob API...");
			// Start generation job
			const jobResponse = await api.startGenerationJob({
				topic: currentTopic,
				language: currentLanguage,
				knowledgeLevel: options.personalization?.knowledgeLevel || "beginner",
				learningGoal: options.personalization?.learningGoal || "overview",
				learningStyle: options.personalization?.learningStyle || "reading",
				tone: options.personalization?.tone || "casual",
			})

			console.log("✅ Generation job started:", jobResponse);

			setGenerationJobId(jobResponse.jobId)
			setGenerationStatus("processing")

			// Start polling for job completion
			if (!isPollingRef.current) {
				isPollingRef.current = true
				const startTime = Date.now()
				const maxPollingTime = 5 * 60 * 1000 // 5 minutes timeout
				
				pollingIntervalRef.current = setInterval(async () => {
					try {
						// Check for timeout
						if (Date.now() - startTime > maxPollingTime) {
							console.log("⏰ Polling timeout reached, stopping...")
							clearInterval(pollingIntervalRef.current!)
							isPollingRef.current = false
							setIsLoading(false)
							toast({
								title: "Timeout",
								description: "Quá trình tạo nội dung mất quá nhiều thời gian.",
								variant: "destructive",
							})
							return
						}
						
						console.log("🔍 Polling job status for jobId:", jobResponse.jobId)
						const statusResponse = await api.getJobStatus(jobResponse.jobId, { includeContent: true })
						console.log("📊 Job status response:", statusResponse.data)
						console.log("🔍 Current status:", statusResponse.data.data?.status)
						console.log("🔍 Response data keys:", Object.keys(statusResponse.data))
						console.log("🔍 Inner data object:", statusResponse.data.data)
						console.log("🔍 Inner data keys:", statusResponse.data.data ? Object.keys(statusResponse.data.data) : 'No inner data')
						console.log("🔍 Full statusResponse structure:", Object.keys(statusResponse))
						
						const jobData = statusResponse.data.data;
						setGenerationStatus(jobData?.status)

						if (jobData?.status === "completed") {
							console.log("✅ Job status is completed, checking result...")
							
							if (jobData.result) {
								console.log("✅ Job completed with result, checking format...")
								
								// Check if result contains actual content or just counts
								const result = jobData.result;
								const hasActualContent = result.flashcards && result.quiz && result.theory;
								const hasOnlyCounts = result.flashcardsCount !== undefined;
								
								console.log("📊 Result format analysis:", {
									hasActualContent,
									hasOnlyCounts,
									flashcardsExists: !!result.flashcards,
									flashcardsLength: result.flashcards?.length,
									quizExists: !!result.quiz,
									quizLength: result.quiz?.length,
									theoryExists: !!result.theory,
									theoryLength: result.theory?.length,
									resultKeys: Object.keys(result)
								});
							
							if (hasActualContent) {
								// Option 1: Full content available
								console.log("🎯 Full content received, saving to Firebase...")
								clearInterval(pollingIntervalRef.current!)
								isPollingRef.current = false
								
								// Save generated content to Firebase
								await saveMultipleData({
									flashcards: result.flashcards,
									quiz: result.quiz,
									theory: result.theory,
								})
								console.log("💾 Data saved to Firebase successfully")

								// Update local state
								setFlashcardSet(result.flashcards)
								setQuizSet(result.quiz)
								setTheorySet(result.theory)
								console.log("🔄 Local state updated with new data")

								toast({
									title: "Tạo nội dung thành công",
									description: "Nội dung học tập đã được tạo.",
								})
								setIsLoading(false)
							} else if (hasOnlyCounts) {
								// Fallback: Only counts received, try to load from Firebase
								console.log("⚠️ Only counts received, loading from Firebase...")
								clearInterval(pollingIntervalRef.current!)
								isPollingRef.current = false
								
								// Try to load data from Firebase (might be saved by job worker)
								await loadInitialData()
								
								toast({
									title: "Tạo nội dung thành công", 
									description: "Nội dung học tập đã được tạo.",
								})
								setIsLoading(false)
							} else {
								console.log("❌ Unexpected result format")
							}
						} else {
							console.log("❌ Job completed but no result provided")
							clearInterval(pollingIntervalRef.current!)
							isPollingRef.current = false
							setIsLoading(false)
							toast({
								title: "Lỗi tạo nội dung",
								description: "Job hoàn thành nhưng không có kết quả.",
								variant: "destructive",
							})
						}
						} else if (jobData?.status === "failed") {
							console.log("❌ Job failed:", jobData.error)
							clearInterval(pollingIntervalRef.current!)
							isPollingRef.current = false
							setIsLoading(false)
							toast({
								title: "Lỗi tạo nội dung",
								description: jobData.error || "Không thể tạo nội dung học tập.",
								variant: "destructive",
							})
						}
					} catch (error) {
						console.error("❌ Error polling job status:", error)
						// Stop polling on error to prevent infinite loop
						clearInterval(pollingIntervalRef.current!)
						isPollingRef.current = false
						setIsLoading(false)
						toast({
							title: "Lỗi kiểm tra trạng thái",
							description: "Không thể kiểm tra trạng thái tạo nội dung.",
							variant: "destructive",
						})
					}
				}, 2000)
			}

		} catch (error) {
			console.error("❌ Error starting generation job:", error)
			setIsLoading(false)
			toast({
				title: "Lỗi tạo nội dung",
				description: "Không thể khởi tạo tạo nội dung học tập.",
				variant: "destructive",
			})
		}
	}, [saveMultipleData, toast])

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
				topic: topic,
				chapterTitle: chapter.title,
				theoryContent: chapter.content,
				language,
			})

			// This returns script directly, not a job ID
			toast({
				title: "Podcast script đã sẵn sàng",
				description: "Script podcast cho chương này đã được tạo xong.",
			})

		} catch (error) {
			console.error("Error generating podcast:", error)
			toast({
				title: "Lỗi tạo podcast",
				description: "Không thể tạo podcast.",
				variant: "destructive",
			})
		} finally {
			setIsGeneratingPodcast(false)
		}
	}, [theorySet, topic, language, toast])

	const handleCloneTopic = useCallback(async (publicTopicId: string) => {
		try {
			setIsLoading(true)
			
			const response = await api.clonePublicTopic({ publicTopicId })
			
			if (response.success) {
				toast({
					title: "Sao chép thành công",
					description: response.message,
				})
				
				// After successful clone, reload the learning data
				await loadInitialData()
			} else {
				toast({
					title: "Lỗi sao chép",
					description: response.message,
					variant: "destructive",
				})
			}

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
	}, [loadInitialData, toast])

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
		refreshData,
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
