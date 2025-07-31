

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
import { getDb, AppData, DataKey } from "@/lib/idb"
import * as api from "@/services/api";
import type {
	CardSet,
	QuizSet,
	TheorySet,
} from "@/ai/schemas"
import type { QuizState, FlashcardState, TheoryState } from "@/app/types"
import { useSettingsContext } from "./SettingsContext"
import { useAuthContext } from "./AuthContext"

interface LearningContextType {
	// State
	isLoading: boolean
	isGeneratingPodcast: boolean

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
	handleGenerate: (forceNew: boolean) => void
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
	onGenerate: (forceNew: boolean) => void
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
	const { user } = useAuthContext();
	const { setHasCompletedOnboarding } = useSettingsContext()

	// Global State
	const [isLoading, setIsLoading] = useState(false)
	const [isGeneratingPodcast, setIsGeneratingPodcast] = useState(false)

	// Learning State
	const [view, setView] = useState<"flashcards" | "quiz" | "theory">("theory")
	const [topic, setTopic] = useState("Lịch sử La Mã")
	const [language, setLanguage] = useState("Vietnamese")
	const [model, setModel] = useState("gemini-2.5-flash-lite")

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
	
	const getUIDBKey = useCallback((key: string) => {
		return `${user?.uid || 'guest'}-${key}`;
	}, [user]);

	// --- Effects ---

	useEffect(() => {
		isMountedRef.current = true;
		if (user !== undefined) { // Check if user state is resolved
			loadInitialData();
		}
		return () => {
			isMountedRef.current = false;
		};
	}, [user]); // Rerun when user logs in/out

	// --- Data Handling Callbacks ---
	const handleClearLearningData = useCallback(async () => {
		if (!user) return;
		const db = await getDb();
		const keysToDelete: DataKey[] = [
			"flashcards", "flashcardState", "flashcardIndex", "quiz", "quizState",
			"theory", "theoryState", "theoryChapterIndex"
		];
		const userKeysToDelete = keysToDelete.map(key => getUIDBKey(key));

		const tx = db.transaction("data", "readwrite");
		const store = tx.objectStore("data");
		await Promise.all(userKeysToDelete.map(key => store.delete(key)));
		await tx.done;

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
			description:
				"Toàn bộ dữ liệu học tập cho chủ đề cũ đã được xóa.",
		})
	}, [toast, user, getUIDBKey]);

	const loadInitialData = useCallback(async () => {
		if (!user) {
			// If no user, reset all learning state
			setFlashcardSet(null);
			setQuizSet(null);
			setTheorySet(null);
			setFlashcardState({ understoodIndices: [] });
			setQuizState({ currentQuestionIndex: 0, answers: {} });
			setTheoryState({ understoodIndices: [] });
			setFlashcardIndex(0);
			setCurrentQuestionIndex(0);
			setTheoryChapterIndex(0);
			setTopic("Lịch sử La Mã");
			setLanguage("Vietnamese");
			setModel("gemini-2.5-flash-lite");
			return;
		};
		const db = await getDb()
		const [
			savedViewRes,
			savedTopicRes,
			savedLanguageRes,
			savedModelRes,
			flashcardDataRes,
			flashcardStateRes,
			quizDataRes,
			quizStateRes,
			theoryDataRes,
			theoryStateRes,
		] = await Promise.all([
			db.get("data", getUIDBKey("view")),
			db.get("data", getUIDBKey("topic")),
			db.get("data", getUIDBKey("language")),
			db.get("data", getUIDBKey("model")),
			db.get("data", getUIDBKey("flashcards")),
			db.get("data", getUIDBKey("flashcardState")),
			db.get("data", getUIDBKey("quiz")),
			db.get("data", getUIDBKey("quizState")),
			db.get("data", getUIDBKey("theory")),
			db.get("data", getUIDBKey("theoryState")),
		])

		const savedView =
			(savedViewRes?.data as "flashcards" | "quiz" | "theory") || "theory"
		const savedTopic = (savedTopicRes?.data as string) || "Lịch sử La Mã"
		const savedLanguage = (savedLanguageRes?.data as string) || "Vietnamese"
		const savedModel =
			(savedModelRes?.data as string) || "gemini-2.5-flash-lite"

		setView(savedView)
		setTopic(savedTopic)
		setLanguage(savedLanguage)
		setModel(savedModel)

		const flashcardData = flashcardDataRes?.data as CardSet;
		const quizData = quizDataRes?.data as QuizSet;
		const theoryData = theoryDataRes?.data as TheorySet;
		const flashcardStateData = flashcardStateRes?.data as FlashcardState;
		const quizStateData = quizStateRes?.data as QuizState;
		const theoryStateData = theoryStateRes?.data as TheoryState;
		
		setFlashcardSet(flashcardData || null);
		setQuizSet(quizData || null);
		setTheorySet(theoryData || null);

		setFlashcardState(flashcardStateData || { understoodIndices: [] });
		if (flashcardData) {
			const firstUnseenIndex = flashcardData.cards.findIndex(
				(_, index) => !(flashcardStateData?.understoodIndices.includes(index))
			);
			setFlashcardIndex(firstUnseenIndex !== -1 ? firstUnseenIndex : 0);
		} else {
			setFlashcardIndex(0);
		}
		
		setQuizState(quizStateData || { currentQuestionIndex: 0, answers: {} });
		if (quizData) {
			const firstUnansweredIndex = quizData.questions.findIndex(
				(_, index) => !quizStateData?.answers[index]
			);
			const newCurrentQuestionIndex = firstUnansweredIndex !== -1 ? firstUnansweredIndex : 0;
			setCurrentQuestionIndex(newCurrentQuestionIndex);
			if(quizStateData) {
				setQuizState({...quizStateData, currentQuestionIndex: newCurrentQuestionIndex});
			} else {
				setQuizState({ currentQuestionIndex: newCurrentQuestionIndex, answers: {} });
			}
		} else {
			setCurrentQuestionIndex(0);
		}

		setTheoryState(theoryStateData || { understoodIndices: [] });
		if (theoryData) {
			const firstUnseenIndex = theoryData.chapters.findIndex(
				(_, index) => !theoryStateData?.understoodIndices.includes(index)
			);
			setTheoryChapterIndex(firstUnseenIndex !== -1 ? firstUnseenIndex : 0);
		} else {
			setTheoryChapterIndex(0);
		}

	}, [user, getUIDBKey]);

	// --- AI Generation Callbacks ---
	const handleGenerate = useCallback(
		async (forceNew: boolean = false) => {
			if (!topic.trim()) {
				toast({
					title: "Chủ đề trống",
					description: "Vui lòng nhập một chủ đề để bắt đầu tạo.",
					variant: "destructive",
				})
				return
			}
			if (!user) {
				toast({
					title: "Yêu cầu đăng nhập",
					description: "Bạn cần đăng nhập để tạo nội dung.",
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
				toast({
					title: "Bắt đầu tạo...",
					description: "Đang yêu cầu nội dung từ máy chủ. Quá trình này có thể mất một lúc.",
				})

				// Clear old data before fetching new data
				await handleClearLearningData();

				// Single API call to the backend
				const response = await api.generateAllContent({
					topic,
					language,
				});

				if (!response || !response.theorySet || !response.flashcardSet || !response.quizSet) {
					throw new Error("Phản hồi từ máy chủ không hợp lệ.");
				}

				// Destructure the complete data sets
				const { theorySet: newTheorySet, flashcardSet: newFlashcardSet, quizSet: newQuizSet } = response;

				// Save all data to IndexedDB
				await Promise.all([
					db.put("data", { id: getUIDBKey("theory"), data: newTheorySet }),
					db.put("data", { id: getUIDBKey("flashcards"), data: newFlashcardSet }),
					db.put("data", { id: getUIDBKey("quiz"), data: newQuizSet }),
				]);

				// Update state in one go
				if (isMountedRef.current) {
					setTheorySet(newTheorySet);
					setFlashcardSet(newFlashcardSet);
					setQuizSet(newQuizSet);
					
					// Reset progress states
					setTheoryState({ understoodIndices: [] });
					setFlashcardState({ understoodIndices: [] });
					setQuizState({ currentQuestionIndex: 0, answers: {} });
					
					// Reset indices
					setTheoryChapterIndex(0);
					setFlashcardIndex(0);
					setCurrentQuestionIndex(0);
				}

				toast({
					title: "Hoàn tất!",
					description: "Tất cả nội dung cho chủ đề đã được tạo và tải về.",
				})

			} catch (error: any) {
				console.error(
					`🚫 Lỗi nghiêm trọng trong quá trình tạo:`,
					error
				)
				toast({
					title: "Lỗi tạo nội dung",
					description: `Đã xảy ra lỗi: ${error.message}.`,
					variant: "destructive",
				})
			} finally {
				isGeneratingRef.current = false
				if (isMountedRef.current) setIsLoading(false)
			}
		},
		[
			toast,
			topic,
			language,
			handleClearLearningData,
			user,
			getUIDBKey,
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
					const scriptResult =
						await api.generatePodcastScript({
							topic,
							chapterTitle: chapter.title,
							theoryContent: chapter.content!,
							language,
						})
					if (!scriptResult?.script)
						throw new Error("Không thể tạo kịch bản podcast.")

					tempTheorySet.chapters[chapterIndex].podcastScript =
						scriptResult.script
					if (isMountedRef.current) setTheorySet({ ...tempTheorySet })
					await db.put("data", {
						id: getUIDBKey("theory"),
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
					const audioResult = await api.generateAudio({
						script: tempTheorySet.chapters[chapterIndex]
							.podcastScript!,
					})
					if (!audioResult?.audioDataUri)
						throw new Error("Không thể tạo file âm thanh podcast.")

					tempTheorySet.chapters[chapterIndex].audioDataUri =
						audioResult.audioDataUri
					if (isMountedRef.current) setTheorySet({ ...tempTheorySet })
					await db.put("data", {
						id: getUIDBKey("theory"),
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
				toast({
					title: "Lỗi không xác định",
					description: `Đã xảy ra lỗi: ${error.message}.`,
					variant: "destructive",
				})
			} finally {
				setIsGeneratingPodcast(false)
				isGeneratingRef.current = false
			}
		},
		[
			theorySet,
			topic,
			language,
			isGeneratingPodcast,
			toast,
			user,
			getUIDBKey,
		]
	)

	// --- Settings Callbacks ---

	const onSettingsSave = useCallback(
		async (settings: {
			topic: string
			language: string
			model: string
		}) => {
			setTopic(settings.topic)
			setLanguage(settings.language)
			setModel(settings.model)
			const db = await getDb()
			await db.put("data", { id: getUIDBKey("topic"), data: settings.topic })
			await db.put("data", { id: getUIDBKey("language"), data: settings.language })
			await db.put("data", { id: getUIDBKey("model"), data: settings.model })
		},
		[getUIDBKey]
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
			await db.put("data", { id: getUIDBKey("view"), data: newView })
		},
		[view, getUIDBKey]
	)

	const onFlashcardIndexChange = useCallback(async (index: number) => {
		setFlashcardIndex(index)
		const db = await getDb()
		await db.put("data", { id: getUIDBKey("flashcardIndex"), data: index })
	}, [getUIDBKey])

	const onCurrentQuestionIndexChange = useCallback(
		(index: number) => {
			setCurrentQuestionIndex(index)
			if (quizState) {
				const newState = { ...quizState, currentQuestionIndex: index }
				setQuizState(newState)
				// Debounce or directly write to DB
				const db = getDb()
				db.then((d) =>
					d.put("data", { id: getUIDBKey("quizState"), data: newState })
				)
			}
		},
		[quizState, getUIDBKey]
	)

	const onTheoryChapterIndexChange = useCallback(async (index: number) => {
		setTheoryChapterIndex(index)
		const db = await getDb()
		await db.put("data", { id: getUIDBKey("theoryChapterIndex"), data: index })
	}, [getUIDBKey])

	const onQuizStateChange = useCallback(async (newState: QuizState) => {
		setQuizState(newState)
		const db = await getDb()
		await db.put("data", { id: getUIDBKey("quizState"), data: newState })
	}, [getUIDBKey])

	const onQuizReset = useCallback(async () => {
		const newQuizState: QuizState = {
			currentQuestionIndex: 0,
			answers: {},
		}
		setQuizState(newQuizState)
		setCurrentQuestionIndex(0)
		setShowQuizSummary(false)

		const db = await getDb()
		await db.put("data", { id: getUIDBKey("quizState"), data: newQuizState })

		toast({
			title: "Bắt đầu lại",
			description: "Bạn có thể bắt đầu lại bài trắc nghiệm.",
		})
	}, [toast, getUIDBKey])

	const onFlashcardStateChange = useCallback(
		async (newState: FlashcardState) => {
			setFlashcardState(newState)
			const db = await getDb()
			await db.put("data", { id: getUIDBKey("flashcardState"), data: newState })
		},
		[getUIDBKey]
	)

	const onFlashcardReset = useCallback(async () => {
		const newFlashcardState: FlashcardState = {
			understoodIndices: [],
		}
		setFlashcardState(newFlashcardState)
		setShowFlashcardSummary(false)
		setFlashcardIndex(0) // Go back to the first card

		const db = await getDb()
		await db.put("data", { id: getUIDBKey("flashcardState"), data: newFlashcardState })
		await db.put("data", { id: getUIDBKey("flashcardIndex"), data: 0 })

		toast({
			title: "Bắt đầu lại",
			description: "Bạn có thể bắt đầu lại bộ thẻ này.",
		})
	}, [toast, getUIDBKey])

	const onTheoryStateChange = useCallback(async (newState: TheoryState) => {
		setTheoryState(newState)
		const db = await getDb()
		await db.put("data", { id: getUIDBKey("theoryState"), data: newState })
	}, [getUIDBKey])

	const onTheoryReset = useCallback(async () => {
		const newTheoryState: TheoryState = {
			understoodIndices: [],
		}
		setTheoryState(newTheoryState)
		setShowTheorySummary(false)
		setTheoryChapterIndex(0)

		const db = await getDb()
		await db.put("data", { id: getUIDBKey("theoryState"), data: newTheoryState })
		await db.put("data", { id: getUIDBKey("theoryChapterIndex"), data: 0 })

		toast({
			title: "Bắt đầu lại",
			description: "Bạn có thể bắt đầu lại phần lý thuyết.",
		})
	}, [toast, getUIDBKey])

	const onGenerate = useCallback(
		(forceNew: boolean) => {
			handleGenerate(forceNew)
		},
		[handleGenerate]
	)

	const value: LearningContextType = {
		isLoading,
		isGeneratingPodcast,
		view,
		topic,
		language,
		model,
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
		onGenerate,
	}

	return (
		<LearningContext.Provider value={value}>
			{children}
		</LearningContext.Provider>
	)
}
