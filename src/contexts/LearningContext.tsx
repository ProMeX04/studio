
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
			setIsLoading(false);
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
				savedJobId,
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
				getData("generationJobId") as Promise<string | null>,
			])

			console.log("📦 Firebase data loaded:", { savedTopic, hasFlashcards: !!savedFlashcards, hasQuiz: !!savedQuiz, hasTheory: !!savedTheory, savedJobId });

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
			if (savedJobId) setGenerationJobId(savedJobId);
			
			// If there's an ongoing job, start polling
			if (savedJobId) {
				const jobStatus = await api.getJobStatus(savedJobId);
				const status = jobStatus.data.data.status;
				if (status === 'processing' || status === 'pending') {
					startPolling(savedJobId);
				} else {
					setGenerationJobId(null); // Job is already finished
				}
			}

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

	const startPolling = useCallback((jobId: string) => {
		if (isPollingRef.current) return; // Already polling
		isPollingRef.current = true;
		
		const poll = async () => {
			if (!isPollingRef.current) return;

			try {
				const statusResponse = await api.getJobStatus(jobId, { includeContent: true });
				const jobData = statusResponse.data.data;
				setGenerationStatus(jobData?.status);

				if (jobData?.status === "completed") {
					clearInterval(pollingIntervalRef.current!);
					isPollingRef.current = false;
					setGenerationJobId(null);
					await saveData("generationJobId", null);

					if (jobData.result) {
						await saveMultipleData({
							flashcards: jobData.result.flashcards,
							quiz: jobData.result.quiz,
							theory: jobData.result.theory,
						});
						await loadInitialData(); // Reload all data from DB
						toast({ title: "Tạo nội dung thành công!", description: "Tài liệu học tập của bạn đã sẵn sàng." });
					}
				} else if (jobData?.status === "failed") {
					clearInterval(pollingIntervalRef.current!);
					isPollingRef.current = false;
					setGenerationJobId(null);
					await saveData("generationJobId", null);
					toast({ title: "Tạo nội dung thất bại", description: jobData.error || "Đã có lỗi xảy ra.", variant: "destructive" });
				}
			} catch (error) {
				console.error("Polling error:", error);
				clearInterval(pollingIntervalRef.current!);
				isPollingRef.current = false;
			}
		};

		pollingIntervalRef.current = setInterval(poll, 5000); // Poll every 5 seconds
	}, [saveData, saveMultipleData, loadInitialData, toast]);


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
			const initialQuizState: QuizState = {
				currentQuestionIndex: 0,
				answers: {},
			};
			setQuizState(initialQuizState);
		}
	}, [quizSet, quizState]);

	// Save functions
	const saveView = useCallback(async (newView: "flashcards" | "quiz" | "theory") => {
		await saveData("view", newView)
	}, [saveData])

	const saveSettings = useCallback(async (settings: { topic: string; language: string; model: string }) => {
		await saveMultipleData({
			topic: settings.topic,
			language: settings.language,
			model: settings.model,
		})
	}, [saveMultipleData])

	// Event handlers
	const onViewChange = useCallback(async (newView: "flashcards" | "quiz" | "theory") => {
		setView(newView)
		await saveView(newView)
	}, [saveView])

	const onFlashcardIndexChange = useCallback(async (index: number) => {
		setFlashcardIndex(index)
		await saveData("flashcardIndex", index)
	}, [saveData])

	const onCurrentQuestionIndexChange = useCallback(async (index: number) => {
		setCurrentQuestionIndex(index)
		await saveData("currentQuestionIndex", index)
	}, [saveData])

	const onTheoryChapterIndexChange = useCallback(async (index: number) => {
		setTheoryChapterIndex(index)
		await saveData("theoryChapterIndex", index)
	}, [saveData])

	const onQuizStateChange = useCallback(async (newState: QuizState) => {
		setQuizState(newState)
		await saveData("quizState", newState)
	}, [saveData])

	const onFlashcardStateChange = useCallback(async (newState: FlashcardState) => {
		setFlashcardState(newState)
		await saveData("flashcardState", newState)
	}, [saveData])

	const onTheoryStateChange = useCallback(async (newState: TheoryState) => {
		setTheoryState(newState)
		await saveData("theoryState", newState)
	}, [saveData])

	const onQuizReset = useCallback(async () => {
		setQuizState(null)
		setCurrentQuestionIndex(0)
		await saveMultipleData({
			quizState: null,
			currentQuestionIndex: 0,
		})
	}, [saveMultipleData])

	const onFlashcardReset = useCallback(async () => {
		setFlashcardState(null)
		setFlashcardIndex(0)
		await saveMultipleData({
			flashcardState: null,
			flashcardIndex: 0,
		})
	}, [saveMultipleData])

	const onTheoryReset = useCallback(async () => {
		setTheoryState(null)
		setTheoryChapterIndex(0)
		await saveMultipleData({
			theoryState: null,
			theoryChapterIndex: 0,
		})
	}, [saveMultipleData])

	const onSettingsSave = useCallback(async (settings: { topic: string; language: string; model: string }) => {
		setTopic(settings.topic)
		setLanguage(settings.language)
		setModel(settings.model)
		await saveSettings(settings)
	}, [saveSettings])

	const handleGenerate = useCallback(async (options: GenerateOptions & { 
		topic?: string; 
		language?: string; 
		model?: string;
	}) => {
		const currentTopic = options.topic || topic;
		const currentLanguage = options.language || language;
		const currentModel = "gemini-2.5-pro"; // Hardcode to pro for best results
		
		if (!currentTopic || !currentLanguage) {
			toast({
				title: "Thiếu thông tin",
				description: "Vui lòng hoàn thành thiết lập trước khi tạo nội dung.",
				variant: "destructive",
			})
			return
		}

		try {
			setGenerationStatus("pending");
			setFlashcardSet(null);
			setQuizSet(null);
			setTheorySet(null);

			if (options.topic && options.topic !== topic) setTopic(options.topic);
			if (options.language && options.language !== language) setLanguage(options.language);
			
			const jobResponse = await api.startGenerationJob({
				topic: currentTopic,
				language: currentLanguage,
				knowledgeLevel: options.personalization?.knowledgeLevel || "beginner",
				learningGoal: options.personalization?.learningGoal || "overview",
				learningStyle: options.personalization?.learningStyle || "reading",
				tone: options.personalization?.tone || "casual",
			})

			setGenerationJobId(jobResponse.jobId);
			await saveData("generationJobId", jobResponse.jobId);
			startPolling(jobResponse.jobId);

		} catch (error) {
			console.error("❌ Error starting generation job:", error)
			setGenerationStatus("failed");
			toast({
				title: "Lỗi tạo nội dung",
				description: "Không thể khởi tạo tạo nội dung học tập.",
				variant: "destructive",
			})
		}
	}, [saveData, startPolling, topic, language, toast])

	const handleGeneratePodcastForChapter = useCallback(async (chapterIndex: number) => {
		// This will be implemented later with Genkit flows
	}, []);

	const handleCloneTopic = useCallback(async (publicTopicId: string) => {
		try {
			setIsLoading(true);
			await api.clonePublicTopic({ publicTopicId });
			await loadInitialData();
			toast({ title: "Sao chép thành công", description: "Chủ đề đã được thêm vào tài khoản của bạn." });
		} catch (error) {
			console.error("Error cloning topic:", error);
			toast({ title: "Lỗi sao chép", description: "Không thể sao chép chủ đề.", variant: "destructive" });
		} finally {
			setIsLoading(false);
		}
	}, [loadInitialData, toast]);

	const handleClearLearningData = useCallback(async () => {
		const keysToClear = [
			"flashcards", "flashcardState", "flashcardIndex",
			"quiz", "quizState", "currentQuestionIndex",
			"theory", "theoryState", "theoryChapterIndex",
			"topic", "language", "model", "view", "generationJobId"
		];
		const nullData = Object.fromEntries(keysToClear.map(key => [key, null]));
		await saveMultipleData(nullData);
		await loadInitialData(); // Reload to clear state
		toast({ title: "Đã xóa dữ liệu học tập" });
	}, [saveMultipleData, loadInitialData, toast]);

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
		isLoading: isLoading || dataLoading || !!generationStatus,
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
