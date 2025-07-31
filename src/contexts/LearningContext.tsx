

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
import { doc, onSnapshot, setDoc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type {
	CardSet,
	QuizSet,
	TheorySet,
	GenerationJob,
} from "@/ai/schemas"
import type { QuizState, FlashcardState, TheoryState } from "@/app/types"
import { useSettingsContext } from "./SettingsContext"
import { useAuthContext } from "./AuthContext"
import { MOCK_CARD_SET, MOCK_QUIZ_SET, MOCK_THEORY_SET, MOCK_TOPIC } from "@/lib/mock-data";

// --- DEV FLAG ---
// Set to true to use mock data and skip the onboarding/generation flow.
const USE_MOCK_DATA = true;
// ----------------

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

// Helper to get the Firestore document for the current user's learning data
const getLearningDocRef = (uid: string) => doc(db, "learningData", uid);


export function LearningProvider({ children }: { children: ReactNode }) {
	const { user } = useAuthContext();
	const { setHasCompletedOnboarding, onOnboardingComplete } = useSettingsContext()

	// Global State
	const [isLoading, setIsLoading] = useState(false)
	const [isGeneratingPodcast, setIsGeneratingPodcast] = useState(false)
	const [generationJobId, setGenerationJobId] = useState<string | null>(null);
	const [generationStatus, setGenerationStatus] = useState<string | null>(null);

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
		if (user !== undefined) {
			loadInitialData();
		}
		return () => {
			isMountedRef.current = false;
		};
	}, [user]);

	// Main Firestore listener for real-time data synchronization
	useEffect(() => {
		if (USE_MOCK_DATA) return;
		if (!user || !db) return;

		const learningDocRef = getLearningDocRef(user.uid);
		const unsubscribe = onSnapshot(learningDocRef, async (doc) => {
			if (!isMountedRef.current) return;
			const data = doc.data();
			if (!data) return;

			// Update state and IndexedDB cache from Firestore
			const db = await getDb();
			if (data.theorySet) {
				setTheorySet(data.theorySet);
				await db.put("data", { id: getUIDBKey("theory"), data: data.theorySet });
			}
			if (data.flashcardSet) {
				setFlashcardSet(data.flashcardSet);
				await db.put("data", { id: getUIDBKey("flashcards"), data: data.flashcardSet });
			}
			if (data.quizSet) {
				setQuizSet(data.quizSet);
				await db.put("data", { id: getUIDBKey("quiz"), data: data.quizSet });
			}
			if (data.quizState) {
				setQuizState(data.quizState);
				await db.put("data", { id: getUIDBKey("quizState"), data: data.quizState });
			}
			if (data.flashcardState) {
				setFlashcardState(data.flashcardState);
				await db.put("data", { id: getUIDBKey("flashcardState"), data: data.flashcardState });
			}
			if (data.theoryState) {
				setTheoryState(data.theoryState);
				await db.put("data", { id: getUIDBKey("theoryState"), data: data.theoryState });
			}
		});

		return () => unsubscribe();
	}, [user, getUIDBKey]);


	// Firestore listener for real-time generation updates
	useEffect(() => {
		if (USE_MOCK_DATA) return;
		if (!generationJobId || !db || !user) {
			if (generationStatus) setGenerationStatus(null);
			return;
		}
	
		const unsubscribe = onSnapshot(
			doc(db, "generationJobs", generationJobId),
			async (doc) => {
				if (!doc.exists()) {
					console.warn(`Job ${generationJobId} not found in Firestore.`);
					return;
				}
	
				const jobData = doc.data() as GenerationJob;
				if (!isMountedRef.current) return;
	
				setGenerationStatus(jobData.statusMessage);
	
				const learningDocRef = getLearningDocRef(user.uid);

				// Update data incrementally in Firestore, which will trigger the main listener
				if (jobData.theorySet && JSON.stringify(jobData.theorySet) !== JSON.stringify(theorySet)) {
					await updateDoc(learningDocRef, { theorySet: jobData.theorySet });
				}
				if (jobData.flashcardSet && JSON.stringify(jobData.flashcardSet) !== JSON.stringify(flashcardSet)) {
					await updateDoc(learningDocRef, { flashcardSet: jobData.flashcardSet });
				}
				if (jobData.quizSet && JSON.stringify(jobData.quizSet) !== JSON.stringify(quizSet)) {
					await updateDoc(learningDocRef, { quizSet: jobData.quizSet });
				}
	
				if (jobData.status === "completed") {
					toast({
						title: "Hoàn tất!",
						description: "Tất cả nội dung cho chủ đề đã được tạo.",
					});
					setGenerationJobId(null);
					setGenerationStatus(null);
					await updateDoc(learningDocRef, { generationJobId: null });
				} else if (jobData.status === "failed") {
					toast({
						title: "Lỗi tạo nội dung",
						description: jobData.error || "Đã xảy ra lỗi không xác định.",
						variant: "destructive",
					});
					setGenerationJobId(null);
					setGenerationStatus(null);
					await updateDoc(learningDocRef, { generationJobId: null });
				}
			}
		);
	
		return () => unsubscribe();
	}, [generationJobId, user]);


	// --- Data Handling Callbacks ---
	const handleClearLearningData = useCallback(async () => {
		if (USE_MOCK_DATA) {
			toast({ title: "Chế độ Mock", description: "Không thể xóa dữ liệu trong chế độ mock." });
			return;
		}
		if (!user) return;
		const db = await getDb();
		const keysToDelete: DataKey[] = [
			"flashcards", "flashcardState", "flashcardIndex", "quiz", "quizState",
			"theory", "theoryState", "theoryChapterIndex", "generationJobId"
		];
		const userKeysToDelete = keysToDelete.map(key => getUIDBKey(key));

		const tx = db.transaction("data", "readwrite");
		const store = tx.objectStore("data");
		await Promise.all(userKeysToDelete.map(key => store.delete(key)));
		await tx.done;

		// Reset Firestore document
		await setDoc(getLearningDocRef(user.uid), {
			topic, // keep current settings
			language,
			model,
		}, { merge: false }); // `merge: false` overwrites the document

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
		setGenerationJobId(null);
    	setGenerationStatus(null);
		setShowFlashcardSummary(false)
		setShowQuizSummary(false)
		setShowTheorySummary(false)

		toast({
			title: "Đã xóa dữ liệu học tập",
			description:
				"Toàn bộ dữ liệu học tập cho chủ đề cũ đã được xóa.",
		})
	}, [toast, user, getUIDBKey, topic, language, model]);

	const loadInitialData = useCallback(async () => {
		if (USE_MOCK_DATA) {
			setTopic(MOCK_TOPIC);
			setTheorySet(MOCK_THEORY_SET);
			setFlashcardSet(MOCK_CARD_SET);
			setQuizSet(MOCK_QUIZ_SET);
			setQuizState({ currentQuestionIndex: 0, answers: {} });
			setFlashcardState({ understoodIndices: [] });
			setTheoryState({ understoodIndices: [] });
			setHasCompletedOnboarding(true);
			return;
		}

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
			setGenerationJobId(null);
			setGenerationStatus(null);
			return;
		};
		// Load from cache first for instant UI
		const db = await getDb()
		const [
			savedViewRes,
			savedTopicRes,
			savedLanguageRes,
			savedModelRes,
			flashcardDataRes,
			quizDataRes,
			theoryDataRes,
			jobIdRes,
		] = await Promise.all([
			db.get("data", getUIDBKey("view")),
			db.get("data", getUIDBKey("topic")),
			db.get("data", getUIDBKey("language")),
			db.get("data", getUIDBKey("model")),
			db.get("data", getUIDBKey("flashcards")),
			db.get("data", getUIDBKey("quiz")),
			db.get("data", getUIDBKey("theory")),
			db.get("data", getUIDBKey("generationJobId")),
		])

		// Settings are still loaded from IndexedDB for persistence across sessions
		if(savedViewRes?.data) setView(savedViewRes.data);
		if(savedTopicRes?.data) setTopic(savedTopicRes.data);
		if(savedLanguageRes?.data) setLanguage(savedLanguageRes.data);
		if(savedModelRes?.data) setModel(savedModelRes.data);

		// Learning content is also loaded from cache for speed, but will be overwritten by Firestore listener
		if(flashcardDataRes?.data) setFlashcardSet(flashcardDataRes.data);
		if(quizDataRes?.data) setQuizSet(quizDataRes.data);
		if(theoryDataRes?.data) setTheorySet(theoryDataRes.data);

		// Check Firestore for a running job that might have been missed
		const learningDoc = await getDoc(getLearningDocRef(user.uid));
		const firestoreJobId = learningDoc.data()?.generationJobId;
		if (firestoreJobId) {
			setGenerationJobId(firestoreJobId);
		} else if (jobIdRes?.data) {
			setGenerationJobId(jobIdRes.data)
		}

	}, [user, getUIDBKey, setHasCompletedOnboarding]);

	// --- AI Generation Callbacks ---
	const handleCloneTopic = useCallback(async (publicTopicId: string) => {
		if (USE_MOCK_DATA) {
			toast({ title: "Chế độ Mock", description: "Tính năng này không khả dụng trong chế độ mock." });
			return;
		}
		if (!user) {
			throw new Error("Bạn phải đăng nhập để tải về chủ đề.");
		}
		
		await api.clonePublicTopic({ publicTopicId });
		
		// The onSnapshot listener will automatically pick up the new data
		// once the backend function updates the user's learningData document.
		// We just need to mark onboarding as complete.
		const clonedTopicDoc = await getDoc(getLearningDocRef(user.uid));
		const clonedData = clonedTopicDoc.data();

		if (clonedData) {
			onOnboardingComplete(clonedData.topic, clonedData.language, clonedData.model);
			toast({
				title: "Tải về thành công!",
				description: `Bạn có thể bắt đầu học chủ đề "${clonedData.topic}".`
			});
		}
	}, [user, onOnboardingComplete, toast]);
	
	const handleGenerate = useCallback(
		async (options: GenerateOptions) => {
			if (USE_MOCK_DATA) {
				toast({ title: "Chế độ Mock", description: "Tính năng này không khả dụng trong chế độ mock." });
				return;
			}
			const { forceNew, personalization } = options;
	
			if (!topic.trim()) {
				toast({
					title: "Chủ đề trống",
					description: "Vui lòng nhập một chủ đề để bắt đầu tạo.",
					variant: "destructive",
				});
				return;
			}
			if (!user) {
				toast({
					title: "Yêu cầu đăng nhập",
					description: "Bạn cần đăng nhập để tạo nội dung.",
					variant: "destructive",
				});
				return;
			}
			if (generationJobId) {
				toast({
					title: "Đang tạo...",
					description: `Một quá trình tạo nội dung khác đang chạy.`,
				});
				return;
			}
	
			if (forceNew) {
				await handleClearLearningData();
			}
	
			setIsLoading(true);
	
			try {
				const apiInput = {
					topic,
					language,
					knowledgeLevel: personalization?.knowledgeLevel ?? 'beginner',
					learningGoal: personalization?.learningGoal ?? 'overview',
					learningStyle: personalization?.learningStyle ?? 'reading',
					tone: personalization?.tone ?? 'casual',
				};
	
				const { jobId } = await api.startGenerationJob(apiInput);
	
				if (!jobId) {
					throw new Error("Backend did not return a job ID.");
				}
				
				if (isMountedRef.current) {
					setGenerationJobId(jobId);
					await updateDoc(getLearningDocRef(user.uid), { generationJobId: jobId });
					const db = await getDb();
					await db.put("data", { id: getUIDBKey("generationJobId"), data: jobId });
				}
	
			} catch (error: any) {
				console.error("🚫 Lỗi bắt đầu quá trình tạo:", error);
				toast({
					title: "Lỗi khởi tạo",
					description: `Không thể bắt đầu quá trình tạo: ${error.message}.`,
					variant: "destructive",
				});
				if (isMountedRef.current) {
					setGenerationJobId(null);
					setGenerationStatus(null);
				}
			} finally {
				if (isMountedRef.current) setIsLoading(false);
			}
		},
		[toast, topic, language, handleClearLearningData, user, getUIDBKey, generationJobId]
	);

	const handleGeneratePodcastForChapter = useCallback(
		async (chapterIndex: number) => {
			if (USE_MOCK_DATA) {
				toast({ title: "Chế độ Mock", description: "Tính năng này không khả dụng trong chế độ mock." });
				return;
			}
			if (!user) return;
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
			isGeneratingRef.current = true
			
			const chapter = theorySet.chapters[chapterIndex]
			const learningDocRef = getLearningDocRef(user.uid);

			try {
				let tempTheorySet = { ...theorySet };
				if (!chapter.podcastScript) {
					const scriptResult = await api.generatePodcastScript({ topic, chapterTitle: chapter.title, theoryContent: chapter.content!, language });
					if (!scriptResult?.script) throw new Error("Không thể tạo kịch bản podcast.");
					tempTheorySet.chapters[chapterIndex].podcastScript = scriptResult.script;
				}
				if (!chapter.audioDataUri) {
					const audioResult = await api.generateAudio({ script: tempTheorySet.chapters[chapterIndex].podcastScript! });
					if (!audioResult?.audioDataUri) throw new Error("Không thể tạo file âm thanh podcast.");
					tempTheorySet.chapters[chapterIndex].audioDataUri = audioResult.audioDataUri;
				}

				await updateDoc(learningDocRef, { theorySet: tempTheorySet });
				toast({ title: "Hoàn tất!", description: `Podcast cho chương "${chapter.title}" đã được tạo.` });

			} catch (error: any) {
				console.error(`🚫 Lỗi tạo podcast cho chương ${chapterIndex}:`, error);
				toast({ title: "Lỗi không xác định", description: `Đã xảy ra lỗi: ${error.message}.`, variant: "destructive", });
			} finally {
				setIsGeneratingPodcast(false)
				isGeneratingRef.current = false
			}
		},
		[ theorySet, topic, language, isGeneratingPodcast, toast, user ]
	);

	// --- Settings Callbacks ---

	const onSettingsSave = useCallback(
		async (settings: {
			topic: string
			language: string
			model: string
		}) => {
			if (USE_MOCK_DATA) return;
			setTopic(settings.topic)
			setLanguage(settings.language)
			setModel(settings.model)
			const db = await getDb()
			await db.put("data", { id: getUIDBKey("topic"), data: settings.topic })
			await db.put("data", { id: getUIDBKey("language"), data: settings.language })
			await db.put("data", { id: getUIDBKey("model"), data: settings.model })

			if (user) {
				await updateDoc(getLearningDocRef(user.uid), {
					topic: settings.topic,
					language: settings.language,
					model: settings.model,
				});
			}
		},
		[getUIDBKey, user]
	)

	// --- Learning UI Callbacks (reordered to fix initialization error) ---

	const onQuizStateChange = useCallback(async (newState: QuizState) => {
		setQuizState(newState);
		if (USE_MOCK_DATA || !user) return;
		await updateDoc(getLearningDocRef(user.uid), { quizState: newState });
	}, [user]);

	const onFlashcardStateChange = useCallback(
		async (newState: FlashcardState) => {
			setFlashcardState(newState);
			if (USE_MOCK_DATA || !user) return;
			await updateDoc(getLearningDocRef(user.uid), { flashcardState: newState });
		},
		[user]
	);

	const onTheoryStateChange = useCallback(async (newState: TheoryState) => {
		setTheoryState(newState);
		if (USE_MOCK_DATA || !user) return;
		await updateDoc(getLearningDocRef(user.uid), { theoryState: newState });
	}, [user]);

	const onViewChange = useCallback(
		async (newView: "flashcards" | "quiz" | "theory") => {
			if (view === newView) return
			setView(newView)
			setShowQuizSummary(false)
			setShowFlashcardSummary(false)
			setShowTheorySummary(false)
			if (USE_MOCK_DATA) return;
			const db = await getDb()
			await db.put("data", { id: getUIDBKey("view"), data: newView })
		},
		[view, getUIDBKey]
	);

	const onFlashcardIndexChange = useCallback(async (index: number) => {
		setFlashcardIndex(index)
		if (USE_MOCK_DATA) return;
		const db = await getDb()
		await db.put("data", { id: getUIDBKey("flashcardIndex"), data: index })
	}, [getUIDBKey]);

	const onCurrentQuestionIndexChange = useCallback(
		(index: number) => {
			setCurrentQuestionIndex(index)
			if (quizState) {
				const newState = { ...quizState, currentQuestionIndex: index }
				onQuizStateChange(newState); // This will handle Firestore update
			}
		},
		[quizState, onQuizStateChange]
	);

	const onTheoryChapterIndexChange = useCallback(async (index: number) => {
		setTheoryChapterIndex(index)
		if (USE_MOCK_DATA) return;
		const db = await getDb()
		await db.put("data", { id: getUIDBKey("theoryChapterIndex"), data: index })
	}, [getUIDBKey]);

	const onQuizReset = useCallback(async () => {
		const newQuizState: QuizState = { currentQuestionIndex: 0, answers: {} }
		onQuizStateChange(newQuizState);
		setCurrentQuestionIndex(0);
		setShowQuizSummary(false);
		toast({ title: "Bắt đầu lại", description: "Bạn có thể bắt đầu lại bài trắc nghiệm." });
	}, [toast, onQuizStateChange]);

	const onFlashcardReset = useCallback(async () => {
		const newFlashcardState: FlashcardState = { understoodIndices: [] }
		onFlashcardStateChange(newFlashcardState);
        setShowFlashcardSummary(false);
		setFlashcardIndex(0);
		toast({ title: "Bắt đầu lại", description: "Bạn có thể bắt đầu lại bộ thẻ này." });
	}, [toast, onFlashcardStateChange]);

	const onTheoryReset = useCallback(async () => {
		const newTheoryState: TheoryState = { understoodIndices: [] }
		onTheoryStateChange(newTheoryState);
		setShowTheorySummary(false);
		setTheoryChapterIndex(0);
		toast({ title: "Bắt đầu lại", description: "Bạn có thể bắt đầu lại phần lý thuyết." });
	}, [toast, onTheoryStateChange]);

	const onGenerate = useCallback(
		(options: GenerateOptions) => {
			handleGenerate(options)
		},
		[handleGenerate]
	);

	const value: LearningContextType = {
		isLoading,
		isGeneratingPodcast,
		generationJobId,
		generationStatus,
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
		handleCloneTopic,
	}

	return (
		<LearningContext.Provider value={value}>
			{children}
		</LearningContext.Provider>
	)
}
