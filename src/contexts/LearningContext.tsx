

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
	QuizQuestion,
	CardData,
} from "@/ai/schemas"
import type { QuizState, FlashcardState, TheoryState } from "@/app/types"
import { useSettingsContext } from "./SettingsContext"
import { useAuthContext } from "./AuthContext"

const FLASHCARDS_PER_CHAPTER = 5
const QUIZ_QUESTIONS_PER_CHAPTER = 4
const MAX_RETRIES = 3

type GenerationStage = "theory" | "flashcards" | "quiz" | "done"
interface GenerationProgress {
	currentChapterIndex: number
	currentStage: GenerationStage
}

interface LearningContextType {
	// State
	isLoading: boolean
	isGeneratingPodcast: boolean
	generationProgress: GenerationProgress | null

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
	const [generationProgress, setGenerationProgress] =
		useState<GenerationProgress | null>(null)

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
	const updateGenerationProgress = useCallback(
		async (progress: GenerationProgress | null) => {
			if (!isMountedRef.current || !user) return
			setGenerationProgress(progress)
			const db = await getDb()
			const dbKey = getUIDBKey("generationProgress");
			if (progress) {
				await db.put("data", { id: dbKey, data: progress })
			} else {
				await db.delete("data", dbKey)
			}
		},
		[user, getUIDBKey]
	)

	const handleClearLearningData = useCallback(async () => {
		if (!user) return;
		const db = await getDb();
		const keysToDelete: DataKey[] = [
			"flashcards", "flashcardState", "flashcardIndex", "quiz", "quizState",
			"theory", "theoryState", "theoryChapterIndex", "generationProgress"
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
		setGenerationProgress(null)

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
			generationProgressRes,
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
			db.get("data", getUIDBKey("generationProgress")),
		])

		const savedView =
			(savedViewRes?.data as "flashcards" | "quiz" | "theory") || "theory"
		const savedTopic = (savedTopicRes?.data as string) || "Lịch sử La Mã"
		const savedLanguage = (savedLanguageRes?.data as string) || "Vietnamese"
		const savedModel =
			(savedModelRes?.data as string) || "gemini-2.5-flash-lite"
		const savedGenerationProgress =
			(generationProgressRes?.data as GenerationProgress) || null

		setGenerationProgress(savedGenerationProgress)

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
				let tempTheorySet = theorySet
				let tempFlashcardSet = flashcardSet
				let tempQuizSet = quizSet
				let localProgress = generationProgress

				// Stage 0: Create outline if forced or doesn't exist
				if (
					forceNew ||
					!tempTheorySet ||
					!localProgress ||
					localProgress.currentStage === "done"
				) {
					toast({
						title: "Bắt đầu tạo...",
						description: "Đang tạo dàn bài cho chủ đề của bạn.",
					})
					try {
						const outlineResponse = await api.generateTheoryOutline({
							topic,
							language,
						})

						if (
							!outlineResponse?.outline ||
							outlineResponse.outline.length === 0
						) {
							throw new Error("Không thể tạo dàn bài hợp lệ.")
						}

						// Clear old learning data AFTER new outline is successfully fetched
						await handleClearLearningData()

						tempTheorySet = {
							id: "idb-theory",
							topic,
							outline: outlineResponse.outline,
							chapters: outlineResponse.outline.map(
								(title) => ({
									title,
									content: null,
									podcastScript: null,
									audioDataUri: null,
								})
							),
						}
						tempFlashcardSet = {
							id: "idb-flashcards",
							topic,
							cards: [],
						}
						tempQuizSet = { id: "idb-quiz", topic, questions: [] }
						localProgress = {
							currentChapterIndex: 0,
							currentStage: "theory",
						}

						await db.put("data", { id: getUIDBKey("theory"), data: tempTheorySet, })
						await db.put("data", { id: getUIDBKey("flashcards"), data: tempFlashcardSet })
						await db.put("data", { id: getUIDBKey("quiz"), data: tempQuizSet })

						if (isMountedRef.current) {
							setTheorySet(tempTheorySet)
							setFlashcardSet(tempFlashcardSet)
							setQuizSet(tempQuizSet)
							setTheoryState({ understoodIndices: [] })
							setFlashcardState({ understoodIndices: [] })
							setQuizState({
								currentQuestionIndex: 0,
								answers: {},
							})
							setTheoryChapterIndex(0)
							setFlashcardIndex(0)
							setCurrentQuestionIndex(0)
						}
						await updateGenerationProgress(localProgress)
					} catch (error) {
						console.error("🚫 Lỗi tạo dàn bài:", error)
						toast({
							title: "Lỗi tạo dàn bài",
							description:
								"Không thể tạo dàn bài cho chủ đề. Vui lòng thử lại.",
							variant: "destructive",
						})
						isGeneratingRef.current = false
						if (isMountedRef.current) setIsLoading(false)
						return
					}
				}

				if (!tempTheorySet || !tempFlashcardSet || !tempQuizSet || !localProgress) {
					throw new Error(
						"State không hợp lệ để bắt đầu tạo nội dung."
					)
				}

				// Main generation loop
				for (
					let i = localProgress.currentChapterIndex;
					i < tempTheorySet.outline.length;
					i++
				) {
					let chapter = tempTheorySet.chapters[i]
					let currentStage = localProgress.currentStage

					const runWithRetry = async <T, U>(
						task: (params: T) => Promise<U>,
						params: T,
						taskName: string
					): Promise<U | null> => {
						for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
							try {
								return await task(params);
							} catch (error) {
								console.error(
									`🚫 Lỗi ${taskName} cho chương "${chapter.title}" (lần ${attempt}):`,
									error
								)
								if (attempt === MAX_RETRIES) {
									toast({
										title: `Lỗi tạo ${taskName}`,
										description: `Không thể tạo nội dung cho chương: "${chapter.title}".`,
										variant: "destructive",
									})
									return null
								}
								await new Promise((res) =>
									setTimeout(res, 1000 * attempt)
								)
							}
						}
						return null
					}

					// STAGE: THEORY
					if (currentStage === "theory") {
						if (!chapter.content) {
							const chapterResult = await runWithRetry(
								api.generateTheoryChapter,
								{
									topic,
									chapterTitle: chapter.title,
									language,
								},
								"Lý thuyết"
							)
							if (chapterResult?.content) {
								tempTheorySet.chapters[i].content =
									chapterResult.content
								await db.put("data", { id: getUIDBKey("theory"), data: { ...tempTheorySet } })
								if (isMountedRef.current)
									setTheorySet({ ...tempTheorySet })
							} else {
								// If theory fails after retries, stop the whole process for this topic.
								throw new Error(
									`Failed to generate theory for chapter "${chapter.title}"`
								)
							}
						}
						currentStage = "flashcards"
						localProgress = {
							currentChapterIndex: i,
							currentStage: "flashcards",
						}
						await updateGenerationProgress(localProgress)
					}

					// STAGE: FLASHCARDS
					if (currentStage === "flashcards") {
						const flashcardResult = await runWithRetry(
							api.generateFlashcards,
							{
								topic,
								count: FLASHCARDS_PER_CHAPTER,
								language,
								existingCards: tempFlashcardSet!.cards,
								theoryContent: `Chapter: ${chapter.title}\n\n${tempTheorySet.chapters[i].content}`,
								source: chapter.title,
							},
							"Flashcards"
						)
						if (
							flashcardResult &&
							Array.isArray(flashcardResult) &&
							flashcardResult.length > 0
						) {
							const cardsWithSource = flashcardResult.map(
								(card: CardData) => ({
									...card,
									source: chapter.title,
								})
							)
							tempFlashcardSet.cards.push(...cardsWithSource)
							await db.put("data", { id: getUIDBKey("flashcards"), data: { ...tempFlashcardSet } })
							if (isMountedRef.current)
								setFlashcardSet({ ...tempFlashcardSet })
						}
						currentStage = "quiz"
						localProgress = {
							currentChapterIndex: i,
							currentStage: "quiz",
						}
						await updateGenerationProgress(localProgress)
					}

					// STAGE: QUIZ
					if (currentStage === "quiz") {
						const quizResult = await runWithRetry(
							api.generateQuiz,
							{
								topic,
								count: QUIZ_QUESTIONS_PER_CHAPTER,
								language,
								existingQuestions: tempQuizSet!.questions,
								theoryContent: `Chapter: ${chapter.title}\n\n${tempTheorySet.chapters[i].content}`,
								source: chapter.title,
							},
							"Trắc nghiệm"
						)
						if (
							quizResult &&
							Array.isArray(quizResult) &&
							quizResult.length > 0
						) {
							const questionsWithSource =
								quizResult.map((q: QuizQuestion) => ({
									...q,
									source: chapter.title,
								}))
							tempQuizSet.questions.push(...questionsWithSource)
							await db.put("data", { id: getUIDBKey("quiz"), data: { ...tempQuizSet } })
							if (isMountedRef.current)
								setQuizSet({ ...tempQuizSet })
						}
						currentStage = "done" // Chapter finished
					}

					if (!isMountedRef.current) break

					// Move to next chapter
					if (i < tempTheorySet.outline.length - 1) {
						localProgress = {
							currentChapterIndex: i + 1,
							currentStage: "theory",
						}
						await updateGenerationProgress(localProgress)
					} else {
						// All chapters are done
						localProgress = {
							currentChapterIndex: i,
							currentStage: "done",
						}
						await updateGenerationProgress(localProgress)
						toast({
							title: "Hoàn tất!",
							description:
								"Tất cả nội dung cho chủ đề đã được tạo.",
						})
						break
					}
				}
			} catch (error: any) {
				console.error(
					`🚫 Lỗi nghiêm trọng trong quá trình tạo:`,
					error
				)
				toast({
					title: "Lỗi tạo nội dung",
					description: `Đã xảy ra lỗi: ${error.message}. Quá trình đã dừng lại.`,
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
			model,
			handleClearLearningData,
			theorySet,
			flashcardSet,
			quizSet,
			generationProgress,
			updateGenerationProgress,
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
			model,
			toast,
			isGeneratingPodcast,
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
		generationProgress,
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
