

      "use client"

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { Greeting } from "@/components/Greeting"
import { Search } from "@/components/Search"
import { QuickLinks } from "@/components/QuickLinks"
import { Clock } from "@/components/Clock"
import { Flashcards } from "@/components/Flashcards"
import type { CardData, CardSet, TheorySet } from "@/ai/schemas"
import { Quiz } from "@/components/Quiz"
import { Theory } from "@/components/Theory"
import { Podcast } from "@/components/Podcast"
import type { QuizSet, QuizQuestion } from "@/ai/schemas"
import type { QuizState, FlashcardState, TheoryState } from "@/app/types"
import { useToast, clearAllToastTimeouts } from "@/hooks/use-toast"
import { generateFlashcards } from "@/ai/flows/generate-flashcards"
import { generateQuiz } from "@/ai/flows/generate-quiz"
import { generateTheoryOutline } from "@/ai/flows/generate-theory-outline"
import { generateTheoryChapter } from "@/ai/flows/generate-theory-chapter"
import { generatePodcastScript } from "@/ai/flows/generate-podcast-script"
import { generateAudio } from "@/ai/flows/generate-audio";
import { Loader, ChevronLeft, ChevronRight, Award, Settings as SettingsIcon, CheckCircle, KeyRound, ExternalLink, Sparkles, BookOpen, Menu, Languages, Plus, BrainCircuit, AudioLines, Podcast as PodcastIcon } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Settings, languages, models } from "@/components/Settings"
import {
	getDb,
	LabeledData,
	AppData,
	DataKey,
	closeDb,
} from "@/lib/idb"
import { Button } from "@/components/ui/button"
import { AIOperationError } from "@/lib/ai-utils"
import { QuizSummary } from "@/components/QuizSummary"
import { FlashcardSummary } from "@/components/FlashcardSummary"
import { TheorySummary } from "@/components/TheorySummary"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const FLASHCARDS_PER_CHAPTER = 5;
const QUIZ_QUESTIONS_PER_CHAPTER = 4;

type ViewType = "flashcards" | "quiz" | "theory" | "podcast";

const ApiKeyGuide = ({ 
	settingsProps, 
	onOnboardingComplete,
	initialTopic,
	initialLanguage,
	initialModel,
	handleGenerate,
}: { 
	settingsProps: any; 
	onOnboardingComplete: (topic: string, language: string, model: string) => void;
	initialTopic: string;
	initialLanguage: string;
	initialModel: string;
	handleGenerate: (forceNew: boolean) => void;
}) => {
	const [onboardingStep, setOnboardingStep] = useState(1);
	const [topic, setTopic] = useState(initialTopic);
	const [language, setLanguage] = useState(initialLanguage || "Vietnamese");
	const [model, setModel] = useState(initialModel);

	const handleNextStep = (e?: React.FormEvent) => {
		e?.preventDefault();
		if (onboardingStep === 1 && !topic.trim()) return;
		setOnboardingStep(onboardingStep + 1);
	};

	const handleBack = () => {
		if (onboardingStep > 1) {
			setOnboardingStep(onboardingStep - 1);
		}
	}
	
	const handleFinishOnboarding = () => {
		onOnboardingComplete(topic, language, model);
	}

	const handleGenerateOnboardingContent = useCallback(() => {
        handleGenerate(true);
    }, [handleGenerate]);

	const onboardingGenerateProps = {
        ...settingsProps,
        onGenerate: handleGenerateOnboardingContent,
    };

	if (onboardingStep === 1) {
		return (
			<div className="w-full h-full flex flex-col items-center justify-center p-4">
				<Card className="w-full max-w-2xl text-center p-8 bg-background/80 backdrop-blur-sm animate-in fade-in duration-500">
					<CardHeader className="p-0 mb-6">
						<div className="flex items-center justify-center gap-4 mb-4">
							<Sparkles className="w-12 h-12 text-primary" />
						</div>
						<CardTitle className="text-3xl font-bold">
							Để bắt đầu, bạn muốn học về chủ đề gì?
						</CardTitle>
						<CardDescription className="text-lg mt-2">
							Nhập một chủ đề bất kỳ và AI sẽ giúp bạn học nó.
						</CardDescription>
					</CardHeader>
					<CardContent className="p-0">
						<form onSubmit={handleNextStep} className="flex items-center gap-2 animate-in fade-in duration-500 delay-300">
							<Input
								value={topic}
								onChange={(e) => setTopic(e.target.value)}
								placeholder="ví dụ: Lịch sử La Mã, Lập trình React..."
								className="text-base h-12"
								autoFocus
							/>
							<Button type="submit" className="h-12">Tiếp tục</Button>
						</form>
					</CardContent>
				</Card>
			</div>
		);
	}

	if (onboardingStep === 2) {
		return (
			<div className="w-full h-full flex flex-col items-center justify-center p-4">
				<Card className="w-full max-w-2xl text-center p-8 bg-background/80 backdrop-blur-sm animate-in fade-in duration-500">
					<CardHeader className="p-0 mb-6">
						<Button variant="ghost" className="absolute top-4 left-4" onClick={handleBack}>
							<ChevronLeft className="mr-2 h-4 w-4" /> Quay lại
						</Button>
						<div className="flex items-center justify-center gap-4 mb-4 pt-8">
							<Languages className="w-12 h-12 text-primary" />
						</div>
						<CardTitle className="text-3xl font-bold">
							Tuyệt vời! Chủ đề của bạn là "{topic}"
						</CardTitle>
						<CardDescription className="text-lg mt-2 space-y-1">
							<p>Bây giờ, hãy chọn ngôn ngữ đầu ra.</p>
							<p className="text-sm text-muted-foreground">Đây là ngôn ngữ mà AI sẽ sử dụng để tạo nội dung học tập cho bạn.</p>
						</CardDescription>
					</CardHeader>
					<CardContent className="p-0">
						<form onSubmit={handleNextStep} className="flex items-center gap-2 animate-in fade-in duration-500 delay-300">
							<Select value={language} onValueChange={setLanguage}>
								<SelectTrigger className="text-base h-12">
									<SelectValue placeholder="Chọn một ngôn ngữ" />
								</SelectTrigger>
								<SelectContent>
									{languages.map((lang) => (
										<SelectItem key={lang.value} value={lang.value}>
											{lang.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<Button type="submit" className="h-12">Tiếp tục</Button>
						</form>
					</CardContent>
				</Card>
			</div>
		);
	}

	if (onboardingStep === 3) {
		return (
			<div className="w-full h-full flex flex-col items-center justify-center p-4">
				<Card className="w-full max-w-2xl text-left p-8 bg-background/80 backdrop-blur-sm animate-in fade-in duration-500">
					<CardHeader className="p-0 mb-6 text-center">
						<Button variant="ghost" className="absolute top-4 left-4" onClick={handleBack}>
							<ChevronLeft className="mr-2 h-4 w-4" /> Quay lại
						</Button>
						<div className="flex items-center justify-center gap-4 mb-4 pt-8">
							<KeyRound className="w-12 h-12 text-primary" />
						</div>
						<CardTitle className="text-3xl font-bold">
							Chỉ còn một bước nhỏ!
						</CardTitle>
						<CardDescription className="text-lg mt-2">
							Để tạo nội dung, bạn cần có API Key (miễn phí) từ Google.
						</CardDescription>
					</CardHeader>
					<CardContent className="p-0 animate-in fade-in duration-500 delay-300">
						<div className="bg-secondary/30 p-4 rounded-lg space-y-2">
							<h4 className="font-semibold text-lg">API Key là gì?</h4>
							<p className="text-muted-foreground">
								Nó giống như một chiếc chìa khóa cho phép ứng dụng này truy cập vào khả năng của Google Gemini AI để tạo nội dung học tập cho bạn. Việc sử dụng key của riêng bạn là hoàn toàn miễn phí trong giới hạn cho phép của Google.
							</p>
						</div>
					</CardContent>
					<CardFooter className="p-0 mt-6 flex flex-col gap-2">
						<Button asChild className="w-full h-12">
							<a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer">
								Lấy API Key tại đây <ExternalLink className="ml-2 h-4 w-4" />
							</a>
						</Button>
						<Button onClick={() => handleNextStep()} variant="outline" className="w-full h-12">Tôi đã có key</Button>
					</CardFooter>
				</Card>
			</div>
		);
	}

	if (onboardingStep === 4) {
		return (
			<div className="w-full h-full flex flex-col items-center justify-center p-4">
				<Card className="w-full max-w-2xl text-left p-8 bg-background/80 backdrop-blur-sm animate-in fade-in duration-500">
					<CardHeader className="p-0 mb-6 text-center">
						<Button variant="ghost" className="absolute top-4 left-4" onClick={handleBack}>
							<ChevronLeft className="mr-2 h-4 w-4" /> Quay lại
						</Button>
						<div className="flex items-center justify-center gap-4 mb-4 pt-8">
							<KeyRound className="w-12 h-12 text-primary" />
						</div>
						<CardTitle className="text-3xl font-bold">
							Thêm API Key của bạn
						</CardTitle>
						<CardDescription className="text-lg mt-2">
							Dán API Key bạn vừa tạo vào ô bên dưới. Bạn nên thêm ít nhất 3 key để có trải nghiệm tốt nhất.
						</CardDescription>
					</CardHeader>
					<CardContent className="p-0 animate-in fade-in duration-500 delay-300">
						<Settings {...settingsProps} scope="learn-onboarding" onSettingsChanged={handleNextStep} />
					</CardContent>
				</Card>
			</div>
		);
	}

	if (onboardingStep === 5) {
		return (
			<div className="w-full h-full flex flex-col items-center justify-center p-4">
				<Card className="w-full max-w-2xl text-center p-8 bg-background/80 backdrop-blur-sm animate-in fade-in duration-500">
					<CardHeader className="p-0 mb-6">
						<Button variant="ghost" className="absolute top-4 left-4" onClick={handleBack}>
							<ChevronLeft className="mr-2 h-4 w-4" /> Quay lại
						</Button>
						<div className="flex items-center justify-center gap-4 mb-4 pt-8">
							<BrainCircuit className="w-12 h-12 text-primary" />
						</div>
						<CardTitle className="text-3xl font-bold">
							Chọn Model AI
						</CardTitle>
						<CardDescription className="text-lg mt-2 space-y-1">
							<p>Chọn model AI bạn muốn sử dụng.</p>
							<p className="text-sm text-muted-foreground">Gemini 1.5 Flash nhanh và hiệu quả, trong khi 1.5 Pro mạnh mẽ hơn.</p>
						</CardDescription>
					</CardHeader>
					<CardContent className="p-0">
						<form onSubmit={handleNextStep} className="flex items-center gap-2 animate-in fade-in duration-500 delay-300">
							<Select value={model} onValueChange={setModel}>
								<SelectTrigger className="text-base h-12">
									<SelectValue placeholder="Chọn một model" />
								</SelectTrigger>
								<SelectContent>
									{models.map((m) => (
										<SelectItem key={m.value} value={m.value}>
											{m.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<Button type="submit" className="h-12">Tiếp tục</Button>
						</form>
					</CardContent>
				</Card>
			</div>
		);
	}

	if (onboardingStep === 6) {
		return (
			<div className="w-full h-full flex flex-col items-center justify-center p-4">
				<Card className="w-full max-w-2xl text-left p-8 bg-background/80 backdrop-blur-sm animate-in fade-in duration-500">
					<CardHeader className="p-0 mb-6 text-center">
						<Button variant="ghost" className="absolute top-4 left-4" onClick={handleBack}>
							<ChevronLeft className="mr-2 h-4 w-4" /> Quay lại
						</Button>
						<div className="flex items-center justify-center gap-4 mb-4 pt-8">
							<Plus className="w-12 h-12 text-primary" />
						</div>
						<CardTitle className="text-3xl font-bold">
							Tạo nội dung đầu tiên
						</CardTitle>
						<CardDescription className="text-lg mt-2">
							Nhấn nút <Plus className="inline w-4 h-4 mx-1" /> để AI bắt đầu tạo nội dung học tập cho bạn.
						</CardDescription>
					</CardHeader>
					<CardContent className="p-0 space-y-4 animate-in fade-in duration-500 delay-300">
						<Settings {...onboardingGenerateProps} scope="learn-onboarding-generate" />
						<p className="text-xs text-muted-foreground text-center px-4">
							Lưu ý: Nếu bạn thoát tab trong khi đang tạo, bạn sẽ cần phải tiếp tục quá trình này thủ công bằng cách nhấn nút <Plus className="inline w-3 h-3" /> trong Cài đặt học tập.
						</p>
					</CardContent>
					<CardFooter className="p-0 mt-6">
						<Button onClick={handleNextStep} className="w-full h-12">
							Tiếp tục
						</Button>
					</CardFooter>
				</Card>
			</div>
		);
	}
	
	if (onboardingStep === 7) {
		return (
			<div className="w-full h-full flex flex-col items-center justify-center p-4">
				<Card className="w-full max-w-2xl text-left p-8 bg-background/80 backdrop-blur-sm animate-in fade-in duration-500">
					<CardHeader className="p-0 mb-6 text-center">
						<div className="flex items-center justify-center gap-4 mb-4">
							<BookOpen className="w-12 h-12 text-primary" />
						</div>
						<CardTitle className="text-3xl font-bold">
							Làm thế nào để tạo nội dung?
						</CardTitle>
						<CardDescription className="text-lg mt-2">
							Bất cứ khi nào bạn muốn tạo hoặc thêm nội dung mới, hãy làm theo cách sau.
						</CardDescription>
					</CardHeader>
					<CardContent className="p-0 animate-in fade-in duration-500 delay-300">
						<div className="bg-secondary/30 p-4 rounded-lg space-y-4 text-center">
							<p className="text-lg">
								Nhấn vào nút <strong>Menu</strong> <Menu className="inline-block h-5 w-5 mx-1" /> trên thanh công cụ và chọn <strong>Tạo / Tiếp tục</strong>.
							</p>
						</div>
					</CardContent>
					<CardFooter className="p-0 mt-6">
						<Button onClick={handleFinishOnboarding} className="w-full h-12">
							Đã hiểu! Bắt đầu học
						</Button>
					</CardFooter>
				</Card>
			</div>
		);
	}

	return null;
};


interface LearnProps {
	view: ViewType
	isLoading: boolean
	flashcardSet: CardSet | null
	quizSet: QuizSet | null
	theorySet: TheorySet | null
	quizState: QuizState | null
	onQuizStateChange: (newState: QuizState) => void
	onQuizReset: () => void;
	onFlashcardIndexChange: (index: number) => void
	flashcardIndex: number
	onViewChange: (view: ViewType) => void
	language: string
	topic: string
	model: string
	showQuizSummary: boolean
	setShowQuizSummary: (show: boolean) => void;
	showFlashcardSummary: boolean;
	setShowFlashcardSummary: (show: boolean) => void;
	showTheorySummary: boolean;
	setShowTheorySummary: (show: boolean) => void;
	flashcardState: FlashcardState | null;
	onFlashcardStateChange: (newState: FlashcardState) => void;
	onFlashcardReset: () => void;
	theoryState: TheoryState | null;
	onTheoryStateChange: (newState: TheoryState) => void;
	onTheoryReset: () => void;
	settingsProps: any;
	currentQuestionIndex: number;
	onCurrentQuestionIndexChange: (index: number) => void;
	theoryChapterIndex: number;
	onTheoryChapterIndexChange: (index: number) => void;
	apiKeys: string[];
	apiKeyIndex: number;
	onApiKeyIndexChange: (index: number) => void;
	onOnboardingComplete: (topic: string, language: string, model: string) => void;
	hasCompletedOnboarding: boolean;
	handleGenerate: (forceNew: boolean) => void;
	handleGeneratePodcastForChapter: (chapterIndex: number) => void;
	isGeneratingPodcast: boolean;
}

function Learn({
	view,
	isLoading,
	flashcardSet,
	quizSet,
	theorySet,
	quizState,
	onQuizStateChange,
	onQuizReset,
	flashcardIndex,
	onFlashcardIndexChange,
	onViewChange,
	language,
	topic,
	model,
	showQuizSummary,
	setShowQuizSummary,
	showFlashcardSummary,
	setShowFlashcardSummary,
	showTheorySummary,
	setShowTheorySummary,
	flashcardState,
	onFlashcardStateChange,
	onFlashcardReset,
	theoryState,
	onTheoryStateChange,
	onTheoryReset,
	settingsProps,
	currentQuestionIndex,
	onCurrentQuestionIndexChange,
	theoryChapterIndex,
	onTheoryChapterIndexChange,
	apiKeys,
	apiKeyIndex,
	onApiKeyIndexChange,
	onOnboardingComplete,
	hasCompletedOnboarding,
	handleGenerate,
	handleGeneratePodcastForChapter,
	isGeneratingPodcast
}: LearnProps) {
	const currentCount = view === "flashcards" 
		? flashcardSet?.cards.length ?? 0
		: view === "quiz"
		? quizSet?.questions.length ?? 0
		: (view === "theory" || view === "podcast")
		? theorySet?.chapters?.filter(c => c.content).length ?? 0
		: 0;
			
	const currentIndex = view === "flashcards" 
		? flashcardIndex 
		: view === "quiz"
		? currentQuestionIndex
		: theoryChapterIndex;

	const totalItems = view === "flashcards" 
		? flashcardSet?.cards.length ?? 0 
		: view === "quiz"
		? quizSet?.questions.length ?? 0
		: theorySet?.outline?.length ?? 0;

	const hasContent = totalItems > 0;

	const handleNext = () => {
		if (currentIndex < totalItems - 1) {
			if (view === 'flashcards') onFlashcardIndexChange(flashcardIndex + 1);
			else if (view === 'quiz') onCurrentQuestionIndexChange(currentQuestionIndex + 1);
			else if (view === 'theory' || view === 'podcast') onTheoryChapterIndexChange(theoryChapterIndex + 1);
		}
	};
	
	const handlePrev = () => {
		if (currentIndex > 0) {
			if (view === 'flashcards') onFlashcardIndexChange(flashcardIndex - 1);
			else if (view === 'quiz') onCurrentQuestionIndexChange(currentQuestionIndex - 1);
			else if (view === 'theory' || view === 'podcast') onTheoryChapterIndexChange(theoryChapterIndex - 1);
		}
	};

	const { correctAnswers, incorrectAnswers, unansweredQuestions } = React.useMemo(() => {
		if (!quizSet || !quizState) {
			return { correctAnswers: 0, incorrectAnswers: 0, unansweredQuestions: quizSet?.questions.length ?? 0 };
		}
	
		let correct = 0;
		const answeredIndices = Object.keys(quizState.answers).map(Number);
	
		for (const index of answeredIndices) {
			const question = quizSet.questions[index];
			const answer = quizState.answers[index];
			if (question && answer && answer.selected === question.answer) {
				correct++;
			}
		}
		
		const answeredCount = answeredIndices.length;
		const incorrect = answeredCount - correct;
		const unanswered = quizSet.questions.length - answeredCount;
	
		return { correctAnswers: correct, incorrectAnswers: incorrect, unansweredQuestions: unanswered };
	}, [quizSet, quizState]);

	const { understoodCount: flashcardUnderstood, notUnderstoodCount: flashcardNotUnderstood } = React.useMemo(() => {
		if (!flashcardSet || !flashcardState) {
			return { understoodCount: 0, notUnderstoodCount: flashcardSet?.cards.length ?? 0 };
		}
		const understood = flashcardState.understoodIndices.length;
		const total = flashcardSet.cards.length;
		return { understoodCount: understood, notUnderstoodCount: total - understood };
	}, [flashcardSet, flashcardState]);

	const { understoodCount: theoryUnderstood, notUnderstoodCount: theoryNotUnderstood } = React.useMemo(() => {
		if (!theorySet || !theoryState) {
			return { understoodCount: 0, notUnderstoodCount: theorySet?.chapters.length ?? 0 };
		}
		const understood = theoryState.understoodIndices.length;
		const total = theorySet.chapters.length;
		return { understoodCount: understood, notUnderstoodCount: total - understood };
	}, [theorySet, theoryState]);


	const allQuestionsAnswered = quizSet && (unansweredQuestions === 0);
	const shouldShowQuizSummary = (showQuizSummary || allQuestionsAnswered) && view === 'quiz';

	const allFlashcardsMarked = flashcardSet && (flashcardUnderstood === flashcardSet.cards.length);
    const shouldShowFlashcardSummary = (showFlashcardSummary || allFlashcardsMarked) && view === 'flashcards';

	const allTheoryChaptersMarked = theorySet && (theoryUnderstood === theorySet.chapters.length);
    const shouldShowTheorySummary = (showTheorySummary || allTheoryChaptersMarked) && (view === 'theory' || view === 'podcast');

	const isSummaryActive = shouldShowQuizSummary || shouldShowFlashcardSummary || shouldShowTheorySummary;
	const isNavDisabled = isSummaryActive;

	const handleToggleUnderstood = () => {
		if (view === 'flashcards') {
			if (!flashcardState || !flashcardSet) return;
			const newUnderstoodIndices = [...flashcardState.understoodIndices];
			const indexPosition = newUnderstoodIndices.indexOf(flashcardIndex);
			if (indexPosition > -1) newUnderstoodIndices.splice(indexPosition, 1);
			else newUnderstoodIndices.push(flashcardIndex);
			onFlashcardStateChange({ understoodIndices: newUnderstoodIndices });
		} else if (view === 'theory' || view === 'podcast') {
			if (!theoryState || !theorySet) return;
			const newUnderstoodIndices = [...theoryState.understoodIndices];
			const indexPosition = newUnderstoodIndices.indexOf(theoryChapterIndex);
			if (indexPosition > -1) newUnderstoodIndices.splice(indexPosition, 1);
			else newUnderstoodIndices.push(theoryChapterIndex);
			onTheoryStateChange({ understoodIndices: newUnderstoodIndices });
		}
	};

	const isCurrentItemUnderstood = useMemo(() => {
		if (view === 'flashcards') {
			if (!flashcardState || !flashcardSet) return false;
			return flashcardState.understoodIndices.includes(flashcardIndex);
		}
		if (view === 'theory' || view === 'podcast') {
			if (!theoryState || !theorySet) return false;
			return theoryState.understoodIndices.includes(theoryChapterIndex);
		}
		return false;
	}, [flashcardState, flashcardIndex, theoryState, theoryChapterIndex, view]);

	if (!hasCompletedOnboarding) {
		return <ApiKeyGuide 
			settingsProps={settingsProps} 
			onOnboardingComplete={onOnboardingComplete} 
			initialTopic={topic}
			initialLanguage={language}
			initialModel={model}
			handleGenerate={handleGenerate}
		/>;
	}

	const renderContent = () => {
		if (shouldShowQuizSummary && quizSet) {
			return (
				<QuizSummary
					correctAnswers={correctAnswers}
					incorrectAnswers={incorrectAnswers}
					unansweredQuestions={unansweredQuestions}
					totalQuestions={quizSet.questions.length}
					onReset={onQuizReset}
					onBack={() => setShowQuizSummary(false)}
					isCompleted={allQuestionsAnswered}
				/>
			);
		}
		if (shouldShowFlashcardSummary && flashcardSet) {
			return (
				<FlashcardSummary
					understoodCount={flashcardUnderstood}
					notUnderstoodCount={flashcardNotUnderstood}
					totalCards={flashcardSet.cards.length}
					onReset={onFlashcardReset}
					onBack={() => setShowFlashcardSummary(false)}
					isCompleted={allFlashcardsMarked}
				/>
			);
		}
		if (shouldShowTheorySummary && theorySet) {
			return (
				<TheorySummary
					understoodCount={theoryUnderstood}
					notUnderstoodCount={theoryNotUnderstood}
					totalChapters={theorySet.chapters.length}
					onReset={onTheoryReset}
					onBack={() => setShowTheorySummary(false)}
					isCompleted={allTheoryChaptersMarked}
				/>
			);
		}
		switch (view) {
			case 'flashcards':
				return <Flashcards
					flashcardSet={flashcardSet}
					flashcardIndex={flashcardIndex}
					topic={topic}
					isCurrentUnderstood={isCurrentItemUnderstood}
				/>;
			case 'quiz':
				return <Quiz
					quizSet={quizSet}
					quizState={quizState}
					onQuizStateChange={onQuizStateChange}
					language={language}
					topic={topic}
					model={model}
					currentQuestionIndex={currentQuestionIndex}
					onCurrentQuestionIndexChange={onCurrentQuestionIndexChange}
					apiKeys={apiKeys}
					apiKeyIndex={apiKeyIndex}
					onApiKeyIndexChange={onApiKeyIndexChange}
				/>;
			case 'theory':
				return <Theory theorySet={theorySet} topic={topic} chapterIndex={theoryChapterIndex} isCurrentUnderstood={isCurrentItemUnderstood} />;
			case 'podcast':
				return <Podcast 
					theorySet={theorySet} 
					topic={topic} 
					chapterIndex={theoryChapterIndex} 
					isCurrentUnderstood={isCurrentItemUnderstood} 
					onGeneratePodcast={handleGeneratePodcastForChapter}
					isGenerating={isGeneratingPodcast}
				/>;
			default:
				return <Theory theorySet={theorySet} topic={topic} chapterIndex={theoryChapterIndex} isCurrentUnderstood={isCurrentItemUnderstood} />;
		}
	};


	return (
		<div className="w-full h-full relative">
			<div className="h-full w-full overflow-y-auto pb-20">
				{renderContent()}
			</div>

			{/* Sticky Toolbar */}
			<div className="absolute bottom-0 left-0 right-0 flex justify-center pb-2">
				<div className="flex flex-wrap items-center justify-center gap-4 bg-background/30 backdrop-blur-sm p-2 rounded-md w-full max-w-2xl">
						<Select
							value={view}
							onValueChange={(value) => onViewChange(value as ViewType)}
						>
							<SelectTrigger className="w-[180px]">
								<SelectValue placeholder="Chọn chế độ" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="theory">Lý thuyết</SelectItem>
								<SelectItem value="podcast">Podcast</SelectItem>
								<SelectItem value="flashcards">Flashcard</SelectItem>
								<SelectItem value="quiz">Trắc nghiệm</SelectItem>
							</SelectContent>
						</Select>
						
						<div className="flex items-center gap-2">
							<Button
								onClick={handlePrev}
								disabled={currentIndex === 0 || !hasContent || isNavDisabled}
								variant="outline"
								size="icon"
								className="h-9 w-9"
							>
								<ChevronLeft className="h-4 w-4" />
							</Button>

							<span className="text-sm text-muted-foreground w-24 text-center">
								{view === "flashcards" ? "Thẻ" : view === "quiz" ? "Câu hỏi" : "Chương"} {hasContent ? currentIndex + 1 : 0} / {totalItems}
							</span>

							<Button
								onClick={handleNext}
								disabled={!hasContent || currentIndex >= totalItems - 1 || isNavDisabled}
								variant="outline"
								size="icon"
								className="h-9 w-9"
							>
								<ChevronRight className="h-4 w-4" />
							</Button>
							
							{(view === 'flashcards' || view === 'theory' || view === 'podcast') && (
								<>
									<Button
										onClick={handleToggleUnderstood}
										disabled={!hasContent || isSummaryActive}
										variant={isCurrentItemUnderstood ? "default" : "outline"}
										size="icon"
										className="h-9 w-9"
									>
										<CheckCircle className="w-4 h-4" />
									</Button>
									<Button
										onClick={() => {
											if (view === 'flashcards') setShowFlashcardSummary(true);
											else if (view === 'theory' || view === 'podcast') setShowTheorySummary(true);
										}}
										disabled={!hasContent || isSummaryActive}
										variant="outline"
										size="icon"
										className="h-9 w-9"
									>
										<Award className="w-4 h-4" />
									</Button>
								</>
							)}


							{view === 'quiz' && (
								<Button
									onClick={() => setShowQuizSummary(true)}
									disabled={!hasContent || isSummaryActive}
									variant="outline"
									size="icon"
									className="h-9 w-9"
								>
									<Award className="h-4 w-4" />
								</Button>
							)}
							
							<Settings {...settingsProps} scope="learn" />

						</div>
				</div>
			</div>
		</div>
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
	const [view, setView] = useState<ViewType>("theory")
	const [topic, setTopic] = useState("Lịch sử La Mã")
	const [language, setLanguage] = useState("Vietnamese")
	const [model, setModel] = useState("gemini-1.5-flash-latest");
	const [isLoading, setIsLoading] = useState(false);
	const [isGeneratingPodcast, setIsGeneratingPodcast] = useState(false);
	const [flashcardSet, setFlashcardSet] = useState<CardSet | null>(null)
	const [quizSet, setQuizSet] = useState<QuizSet | null>(null)
	const [theorySet, setTheorySet] = useState<TheorySet | null>(null);
	const [quizState, setQuizState] = useState<QuizState | null>(null)
	const [flashcardState, setFlashcardState] = useState<FlashcardState | null>(null)
	const [theoryState, setTheoryState] = useState<TheoryState | null>(null);
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
	const [apiKeys, setApiKeys] = useState<string[]>([]);
	const [apiKeyIndex, setApiKeyIndex] = useState(0);
	const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
	
	const [flashcardIndex, setFlashcardIndex] = useState(0)
	const [showQuizSummary, setShowQuizSummary] = useState(false);
	const [showFlashcardSummary, setShowFlashcardSummary] = useState(false);
	const [showTheorySummary, setShowTheorySummary] = useState(false);
	const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
	const [theoryChapterIndex, setTheoryChapterIndex] = useState(0);

	// Prevent race conditions and cleanup async operations
	const isGeneratingRef = useRef(false);
	const isMountedRef = useRef(true)

	// Initialize once
	useEffect(() => {
		return () => {
			isMountedRef.current = false;
			closeDb();
			clearAllToastTimeouts();
		}
	}, []);

	useEffect(() => {
		setIsMounted(true)
	}, [])

	const handleApiKeyIndexChange = useCallback(async (index: number) => {
		if (apiKeyIndex === index) return;
		setApiKeyIndex(index);
		const db = await getDb();
		await db.put("data", { id: "apiKeyIndex", data: index });
	}, [apiKeyIndex]);

	const handleGeneratePodcastForChapter = useCallback(async (chapterIndex: number) => {
		if (!theorySet || !theorySet.chapters[chapterIndex]?.content) {
			toast({ title: "Thiếu nội dung", description: "Cần có nội dung lý thuyết để tạo podcast.", variant: "destructive" });
			return;
		}
		if (isGeneratingRef.current || isGeneratingPodcast) {
			toast({ title: "Đang bận", description: "Một quá trình tạo khác đang chạy.", variant: "destructive" });
			return;
		}

		setIsGeneratingPodcast(true);
		isGeneratingRef.current = true; // Block other generations

		const ttsModel = 'gemini-2.5-flash-preview-tts';
		const db = await getDb();
		let currentKeyIndex = apiKeyIndex;
		const chapter = theorySet.chapters[chapterIndex];

		try {
			let tempTheorySet = { ...theorySet };

			// Generate Script if it doesn't exist
			if (!chapter.podcastScript) {
				const { result, newApiKeyIndex } = await generatePodcastScript({
					apiKeys, apiKeyIndex: currentKeyIndex,
					topic, chapterTitle: chapter.title,
					theoryContent: chapter.content!, language, model
				});
				currentKeyIndex = newApiKeyIndex;
				if (!result?.script) throw new Error("Không thể tạo kịch bản podcast.");
				
				tempTheorySet.chapters[chapterIndex].podcastScript = result.script;
				if (isMountedRef.current) setTheorySet({ ...tempTheorySet });
				await db.put("data", { id: "theory", topic: topic, data: tempTheorySet });
			}

			// Generate Audio if it doesn't exist
			if (tempTheorySet.chapters[chapterIndex].podcastScript && !tempTheorySet.chapters[chapterIndex].audioDataUri) {
				const { result, newApiKeyIndex } = await generateAudio({
					apiKeys, apiKeyIndex: currentKeyIndex,
					script: tempTheorySet.chapters[chapterIndex].podcastScript!, model: ttsModel
				});
				currentKeyIndex = newApiKeyIndex;
				if (!result?.audioDataUri) throw new Error("Không thể tạo file âm thanh podcast.");

				tempTheorySet.chapters[chapterIndex].audioDataUri = result.audioDataUri;
				if (isMountedRef.current) setTheorySet({ ...tempTheorySet });
				await db.put("data", { id: "theory", topic: topic, data: tempTheorySet });
			}

			await handleApiKeyIndexChange(currentKeyIndex);
			toast({ title: "Hoàn tất!", description: `Podcast cho chương "${chapter.title}" đã được tạo.` });

		} catch (error: any) {
			console.error(`🚫 Lỗi tạo podcast cho chương ${chapterIndex}:`, error);
			if (error instanceof AIOperationError) {
				toast({ title: "Lỗi tạo podcast", description: error.message, variant: "destructive" });
			} else {
				toast({ title: "Lỗi không xác định", description: `Đã xảy ra lỗi: ${error.message}.`, variant: "destructive" });
			}
		} finally {
			setIsGeneratingPodcast(false);
			isGeneratingRef.current = false;
		}

	}, [theorySet, topic, language, model, apiKeys, apiKeyIndex, handleApiKeyIndexChange, toast, isGeneratingPodcast]);


	const handleGenerate = useCallback(
		async (forceNew: boolean = false) => {
			if (!apiKeys || apiKeys.length === 0) {
				toast({
					title: "Thiếu API Key",
					description: "Vui lòng nhập API Key Gemini của bạn trong phần Cài đặt.",
					variant: "destructive",
				});
				return;
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

			const db = await getDb();
			let currentKeyIndex = apiKeyIndex;

			try {
				let currentTopic = topic;
				let currentLanguage = language;
				let currentModel = model;

				let theoryData = (await db.get("data", "theory")) as LabeledData<TheorySet> | undefined;
				let currentTheorySet = theoryData?.topic === currentTopic ? theoryData.data : null;
				let currentFlashcardSet = (await db.get("data", "flashcards") as LabeledData<CardSet> | undefined)?.data ?? { id: "idb-flashcards", topic: currentTopic, cards: [] };
				let currentQuizSet = (await db.get("data", "quiz") as LabeledData<QuizSet> | undefined)?.data ?? { id: "idb-quiz", topic: currentTopic, questions: [] };

				// Step 1: Handle new topic or forced reset
				if (forceNew || !currentTheorySet) {
					await handleClearAllData(true); // Clear all learning data for the new topic
					
					// Generate Outline
					const { result: outlineResult, newApiKeyIndex } = await generateTheoryOutline({
						apiKeys,
						apiKeyIndex: currentKeyIndex,
						topic: currentTopic,
						language: currentLanguage,
						model: currentModel,
					});
					currentKeyIndex = newApiKeyIndex;
					
					if (!outlineResult?.outline || outlineResult.outline.length === 0) {
						throw new Error("Failed to generate a valid theory outline.");
					}

					currentTheorySet = {
						id: 'idb-theory',
						topic: currentTopic,
						outline: outlineResult.outline,
						chapters: outlineResult.outline.map(title => ({ title, content: null, podcastScript: null, audioDataUri: null })),
					};
					currentFlashcardSet = { id: "idb-flashcards", topic: currentTopic, cards: [] };
					currentQuizSet = { id: "idb-quiz", topic: currentTopic, questions: [] };
					
					if (isMountedRef.current) {
						setTheorySet(currentTheorySet);
						setFlashcardSet(currentFlashcardSet);
						setQuizSet(currentQuizSet);
						setTheoryState({ understoodIndices: [] });
						setFlashcardState({ understoodIndices: [] });
						setQuizState({ currentQuestionIndex: 0, answers: {} });
						setTheoryChapterIndex(0);
						setFlashcardIndex(0);
						setCurrentQuestionIndex(0);
					}
					await db.put("data", { id: "theory", topic: currentTopic, data: currentTheorySet });
					await db.put("data", { id: "flashcards", topic: currentTopic, data: currentFlashcardSet });
					await db.put("data", { id: "quiz", topic: currentTopic, data: currentQuizSet });
				}

				// Step 2: Sequential Generation Loop
				for (let i = 0; i < currentTheorySet.outline.length; i++) {
					if (!isMountedRef.current) break;
					
					const chapter = currentTheorySet.chapters[i];

					// A. Generate Theory Content if it doesn't exist
					if (!chapter.content) {
						const { result: chapterResult, newApiKeyIndex } = await generateTheoryChapter({
							apiKeys,
							apiKeyIndex: currentKeyIndex,
							topic: currentTopic,
							chapterTitle: chapter.title,
							language: currentLanguage,
							model: currentModel,
						});
						currentKeyIndex = newApiKeyIndex;

						if (chapterResult?.content) {
							currentTheorySet.chapters[i].content = chapterResult.content;
							if (isMountedRef.current) setTheorySet({ ...currentTheorySet });
							await db.put("data", { id: "theory", topic: currentTopic, data: currentTheorySet });
						} else {
							throw new Error(`Failed to generate content for chapter: ${chapter.title}`);
						}
					}
					
					const chapterContent = currentTheorySet.chapters[i].content!;

					// B. Generate Flashcards for the chapter if they don't exist
					const flashcardsForChapterExist = currentFlashcardSet.cards.some(c => c.back.includes(`Source: ${chapter.title}`));
					if (!flashcardsForChapterExist) {
						const { result: newCards, newApiKeyIndex } = await generateFlashcards({
							apiKeys, apiKeyIndex: currentKeyIndex,
							topic: currentTopic, count: FLASHCARDS_PER_CHAPTER,
							language: currentLanguage, model: currentModel,
							theoryContent: `Chapter: ${chapter.title}\n\n${chapterContent}`
						});
						currentKeyIndex = newApiKeyIndex;

						if (Array.isArray(newCards) && newCards.length > 0) {
							const taggedCards = newCards.map(card => ({...card, back: `${card.back}\n\n*Source: ${chapter.title}*`}));
							currentFlashcardSet.cards.push(...taggedCards);
							if (isMountedRef.current) setFlashcardSet({ ...currentFlashcardSet });
							await db.put("data", { id: "flashcards", topic: currentTopic, data: currentFlashcardSet });
						}
					}

					// C. Generate Quiz questions for the chapter if they don't exist
					const quizForChapterExist = currentQuizSet.questions.some(q => q.explanation.includes(`Source: ${chapter.title}`));
					if (!quizForChapterExist) {
						const { result: newQuestions, newApiKeyIndex } = await generateQuiz({
							apiKeys, apiKeyIndex: currentKeyIndex,
							topic: currentTopic, count: QUIZ_QUESTIONS_PER_CHAPTER,
							language: currentLanguage, model: currentModel,
							theoryContent: `Chapter: ${chapter.title}\n\n${chapterContent}`
						});
						currentKeyIndex = newApiKeyIndex;

						if (Array.isArray(newQuestions) && newQuestions.length > 0) {
							const taggedQuestions = newQuestions.map(q => ({...q, explanation: `${q.explanation}\n\n*Source: ${chapter.title}*`}));
							currentQuizSet.questions.push(...taggedQuestions);
							if (isMountedRef.current) setQuizSet({ ...currentQuizSet });
							await db.put("data", { id: "quiz", topic: currentTopic, data: currentQuizSet });
						}
					}

					await handleApiKeyIndexChange(currentKeyIndex);
					if (!isMountedRef.current) break;
					await new Promise(resolve => setTimeout(resolve, 500)); // Small delay between chapter generations
				}

				toast({
                    title: "Hoàn tất!",
                    description: "Tất cả nội dung cho chủ đề đã được tạo thành công.",
                });

			} catch (error: any) {
				console.error(`🚫 Generation process stopped or failed:`, error)
				if (error instanceof AIOperationError) {
					toast({
						title: "Lỗi tạo nội dung",
						description: error.message,
						variant: "destructive",
					});
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
		[toast, apiKeys, apiKeyIndex, handleApiKeyIndexChange, topic, language, model]
	)
	
	const loadInitialData = useCallback(async () => {
		const db = await getDb();
	
		// Migration from single 'apiKey' to 'apiKeys'
		const oldApiKeyRes = await db.get("data", "apiKey" as any);
		if (oldApiKeyRes?.data && typeof oldApiKeyRes.data === 'string') {
			await db.put("data", { id: "apiKeys", data: [oldApiKeyRes.data] });
			await db.delete("data", "apiKey" as any);
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
		]);
	
		const savedApiKeys = (savedApiKeysRes?.data as string[]) || [];
		const savedApiKeyIndex = (savedApiKeyIndexRes?.data as number) || 0;
		const savedView = (savedViewRes?.data as ViewType) || "theory";
		const savedTopic = (savedTopicRes?.data as string) || "Lịch sử La Mã";
		const savedLanguage = (savedLanguageRes?.data as string) || "Vietnamese";
		const savedModel = (savedModelRes?.data as string) || "gemini-1.5-flash-latest";
		const savedVisibility = savedVisibilityRes?.data as ComponentVisibility;
		const savedBg = savedBgRes?.data as string;
		const savedUploadedBgs = (savedUploadedBgsRes?.data as string[]) || [];
		const onboardingCompleted = (onboardingStatusRes?.data as boolean) || false;

		setHasCompletedOnboarding(onboardingCompleted);

		if (savedApiKeys) setApiKeys(savedApiKeys);
		setApiKeyIndex(savedApiKeyIndex < savedApiKeys.length ? savedApiKeyIndex : 0);
		if (savedBg) setBackgroundImage(savedBg);
		setUploadedBackgrounds(savedUploadedBgs);
	
		setView(savedView);
		setTopic(savedTopic);
		setLanguage(savedLanguage);
		setModel(savedModel);
	
		setVisibility(
			savedVisibility ?? {
				clock: true,
				greeting: true,
				search: true,
				quickLinks: true,
				learn: true,
			}
		);
	
		const flashcardData = flashcardDataRes as LabeledData<CardSet>;
		const quizData = quizDataRes as LabeledData<QuizSet>;
		const theoryData = theoryDataRes as LabeledData<TheorySet>;
		const flashcardStateData = flashcardStateRes as AppData;
		const quizStateData = quizStateRes as AppData;
		const theoryStateData = theoryStateRes as AppData;

		let currentFlashcards =
			flashcardData && flashcardData.topic === savedTopic
				? flashcardData.data
				: null;
		
		let currentQuiz =
			quizData && quizData.topic === savedTopic ? quizData.data : null;
		
		let currentTheory = 
			theoryData && theoryData.topic === savedTopic ? theoryData.data : null;

	
		setFlashcardSet(currentFlashcards);
		setQuizSet(currentQuiz);
		setTheorySet(currentTheory);
		
		const currentFlashcardState = (flashcardData && flashcardData.topic === savedTopic && flashcardStateData)
			? flashcardStateData.data as FlashcardState
			: { understoodIndices: [] };
		setFlashcardState(currentFlashcardState);

		let initialFlashcardIndex = 0;
		if (currentFlashcards && currentFlashcards.cards.length > 0) {
			const firstUnseenIndex = currentFlashcards.cards.findIndex(
				(_, index) => !currentFlashcardState.understoodIndices.includes(index)
			);
			if (firstUnseenIndex !== -1) {
				initialFlashcardIndex = firstUnseenIndex;
			}
		}
		setFlashcardIndex(initialFlashcardIndex);

		let currentQuizState: QuizState = { currentQuestionIndex: 0, answers: {} };
		if (quizData && quizData.topic === savedTopic && quizStateData) {
			currentQuizState = quizStateData.data as QuizState;
		}
		
		if (currentQuiz && currentQuiz.questions.length > 0) {
			const firstUnansweredIndex = currentQuiz.questions.findIndex(
				(_, index) => !currentQuizState.answers[index]
			);
			if (firstUnansweredIndex !== -1) {
				currentQuizState.currentQuestionIndex = firstUnansweredIndex;
			}
		}
		setQuizState(currentQuizState);
		setCurrentQuestionIndex(currentQuizState.currentQuestionIndex);

		const currentTheoryState = (theoryData && theoryData.topic === savedTopic && theoryStateData)
			? theoryStateData.data as TheoryState
			: { understoodIndices: [] };
		setTheoryState(currentTheoryState);

		let initialTheoryIndex = 0;
		if (currentTheory && currentTheory.chapters.length > 0) {
			const firstUnseenIndex = currentTheory.chapters.findIndex(
				(_, index) => !currentTheoryState.understoodIndices.includes(index)
			);
			if (firstUnseenIndex !== -1) {
				initialTheoryIndex = firstUnseenIndex;
			}
		}
		setTheoryChapterIndex(initialTheoryIndex);

	}, []);
	

	const handleClearAllData = useCallback(async (isLearningReset: boolean = false) => {
		const db = await getDb();
		const keysToDelete: DataKey[] = isLearningReset 
			? [
				"flashcards", "flashcardState", "flashcardIndex",
				"quiz", "quizState",
				"theory", "theoryState", "theoryChapterIndex",
			]
			: [
				"flashcards", "flashcardState", "flashcardIndex",
				"quiz", "quizState",
				"theory", "theoryState", "theoryChapterIndex",
				'topic', 'language', 'model', 'view', 'visibility', 
				'background', 'uploadedBackgrounds', 
				'apiKeys', 'apiKeyIndex',
				'hasCompletedOnboarding'
			];
	
		const tx = db.transaction("data", 'readwrite');
		const store = tx.objectStore("data");
		await Promise.all(keysToDelete.map(key => store.delete(key)));
		await tx.done;

		// Reset state in memory
		setFlashcardSet(null);
		setFlashcardState({ understoodIndices: [] });
		setFlashcardIndex(0);
		setQuizSet(null);
		setQuizState({ currentQuestionIndex: 0, answers: {} });
		setCurrentQuestionIndex(0);
		setTheorySet(null);
		setTheoryState({ understoodIndices: [] });
		setTheoryChapterIndex(0);
		setShowFlashcardSummary(false);
		setShowQuizSummary(false);
		setShowTheorySummary(false);
	
		if (!isLearningReset) {
			setTopic("Lịch sử La Mã");
			setLanguage("Vietnamese");
			setModel("gemini-1.5-flash-latest");
			setView("theory");
			setVisibility({ clock: true, greeting: true, search: true, quickLinks: true, learn: true });
			setBackgroundImage("");
			setUploadedBackgrounds([]);
			setApiKeys([]);
			setApiKeyIndex(0);
			setHasCompletedOnboarding(false);
		} else {
            toast({
                title: "Đã xóa dữ liệu học tập",
                description: "Toàn bộ dữ liệu học tập cho chủ đề cũ đã được xóa."
            });
            return; 
        }
	
		toast({
			title: "Đã xóa dữ liệu",
			description: "Toàn bộ dữ liệu ứng dụng đã được xóa.",
		});
	}, [toast]);

	const handleResetOnboarding = useCallback(async () => {
        const db = await getDb();
        await db.delete('data', 'hasCompletedOnboarding');
        window.location.reload();
    }, []);

	useEffect(() => {
		if (isMounted) {
			loadInitialData()
		}
	}, [isMounted, loadInitialData])

	const onSettingsSave = useCallback(
		async (settings: {
			topic: string
			language: string
		}) => {
			const {
				topic: newTopic,
				language: newLanguage,
			} = settings
			const db = await getDb()
			
			const topicChanged = topic !== newTopic;

			if (topicChanged) {
				setTopic(newTopic)
				await db.put("data", { id: "topic", data: newTopic })
				await handleClearAllData(true);
			}
			if (language !== newLanguage) {
				setLanguage(newLanguage)
				await db.put("data", { id: "language", data: newLanguage })
			}
		},
		[
			topic, 
			language,
			handleClearAllData,
		]
	)

	const onGenerate = useCallback(
		(forceNew: boolean) => {
			handleGenerate(forceNew);
		}, 
		[handleGenerate]
	);


	const handleBackgroundChange = useCallback(
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

	const handleApiKeysChange = useCallback(
		async (newApiKeys: string[]) => {
			setApiKeys(newApiKeys);
			const currentKeyIndex = apiKeyIndex >= newApiKeys.length ? 0 : apiKeyIndex;
			setApiKeyIndex(currentKeyIndex);
			const db = await getDb();
			await db.put("data", { id: "apiKeys", data: newApiKeys });
			await db.put("data", { id: "apiKeyIndex", data: currentKeyIndex });
		},
		[apiKeyIndex]
	);

	const handleModelChange = useCallback(async (newModel: string) => {
		if (model === newModel) return;
		setModel(newModel);
		const db = await getDb();
		await db.put("data", { id: "model", data: newModel });
	}, [model]);


	const handleUploadedBackgroundsChange = useCallback(
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

	const handleVisibilityChange = useCallback(
		async (newVisibility: ComponentVisibility) => {
			if (
				visibility.clock === newVisibility.clock &&
				visibility.greeting === newVisibility.greeting &&
				visibility.search === newVisibility.search &&
				visibility.quickLinks === newVisibility.quickLinks
			)
				return

			setVisibility(newVisibility)
			const db = await getDb()
			await db.put("data", { id: "visibility", data: newVisibility })
		},
		[visibility]
	)

	const handleViewChange = useCallback(
		async (newView: ViewType) => {
			if (view === newView) return
			setView(newView)
			setShowQuizSummary(false); // Hide summary when switching views
			setShowFlashcardSummary(false);
			setShowTheorySummary(false);
			const db = await getDb()
			await db.put("data", { id: "view", data: newView })
		},
		[view]
	)

	const handleCurrentQuestionIndexChange = useCallback((index: number) => {
        setCurrentQuestionIndex(index);
        if (quizState) {
            const newState = { ...quizState, currentQuestionIndex: index };
            setQuizState(newState);
            // Debounce or directly write to DB
            const db = getDb();
            db.then(d => d.put("data", { id: "quizState", data: newState }));
        }
    }, [quizState]);

	const handleQuizStateChange = useCallback(async (newState: QuizState) => {
		setQuizState(newState)
		const db = await getDb()
		await db.put("data", { id: "quizState", data: newState })
	}, [])

	const handleQuizReset = useCallback(async () => {
		const newQuizState: QuizState = {
			currentQuestionIndex: 0,
			answers: {},
		};
		setQuizState(newQuizState);
		setCurrentQuestionIndex(0);
		setShowQuizSummary(false);
	
		const db = await getDb();
		await db.put("data", { id: "quizState", data: newQuizState });
	
		toast({
			title: "Bắt đầu lại",
			description: "Bạn có thể bắt đầu lại bài trắc nghiệm.",
		});
	}, [toast]);

	const handleFlashcardStateChange = useCallback(async (newState: FlashcardState) => {
		setFlashcardState(newState);
		const db = await getDb();
		await db.put("data", { id: "flashcardState", data: newState });
	}, []);

	const handleFlashcardReset = useCallback(async () => {
		const newFlashcardState: FlashcardState = {
			understoodIndices: [],
		};
		setFlashcardState(newFlashcardState);
		setShowFlashcardSummary(false);
		setFlashcardIndex(0); // Go back to the first card

		const db = await getDb();
		await db.put("data", { id: "flashcardState", data: newFlashcardState });
		await db.put("data", { id: "flashcardIndex", data: 0 });


		toast({
			title: "Bắt đầu lại",
			description: "Bạn có thể bắt đầu lại bộ thẻ này.",
		});
	}, [toast]);

	const handleTheoryStateChange = useCallback(async (newState: TheoryState) => {
		setTheoryState(newState);
		const db = await getDb();
		await db.put("data", { id: "theoryState", data: newState });
	}, []);
	
	const handleTheoryReset = useCallback(async () => {
		const newTheoryState: TheoryState = {
			understoodIndices: [],
		};
		setTheoryState(newTheoryState);
		setShowTheorySummary(false);
		setTheoryChapterIndex(0);
	
		const db = await getDb();
		await db.put("data", { id: "theoryState", data: newTheoryState });
		await db.put("data", { id: "theoryChapterIndex", data: 0 });
	
		toast({
			title: "Bắt đầu lại",
			description: "Bạn có thể bắt đầu lại phần lý thuyết.",
		});
	}, [toast]);

	const handleFlashcardIndexChange = useCallback(
		async (index: number) => {
			setFlashcardIndex(index);
			const db = await getDb();
			await db.put("data", { id: "flashcardIndex", data: index });
		},
		[] 
	);

	const handleTheoryChapterIndexChange = useCallback(
		async (index: number) => {
			setTheoryChapterIndex(index);
			const db = await getDb();
			await db.put("data", { id: "theoryChapterIndex", data: index });
		},
		[] 
	);

	const handleOnboardingComplete = useCallback(
		async (finalTopic: string, finalLanguage: string, finalModel: string) => {
			setTopic(finalTopic);
			setLanguage(finalLanguage);
			setModel(finalModel);
			setHasCompletedOnboarding(true);
			const db = await getDb();
			await db.put("data", { id: "topic", data: finalTopic });
			await db.put("data", { id: "language", data: finalLanguage });
			await db.put("data", { id: "model", data: finalModel });
			await db.put("data", { id: "hasCompletedOnboarding", data: true });
		},
		[]
	);

	if (!isMounted) {
		return null
	}
	
	const learnSettingsProps = {
		onSettingsChange: onSettingsSave,
		onGenerate: onGenerate,
		onClearLearningData: () => handleClearAllData(true),
		isLoading: isLoading,
		topic: topic,
		language: language,
		model: model,
		onModelChange: handleModelChange,
		onApiKeysChange: handleApiKeysChange,
		onResetOnboarding: handleResetOnboarding,
		apiKeys: apiKeys,
		theorySet: theorySet,
		flashcardSet: flashcardSet,
		quizSet: quizSet,
	};

	const globalSettingsProps = {
		onClearAllData: () => handleClearAllData(false),
		onVisibilityChange: handleVisibilityChange,
		onBackgroundChange: handleBackgroundChange,
		onUploadedBackgroundsChange: handleUploadedBackgroundsChange,
		visibility: visibility,
		uploadedBackgrounds: uploadedBackgrounds,
		currentBackgroundImage: backgroundImage,
	}

	return (
		<main className="relative min-h-screen w-full lg:grid lg:grid-cols-[1.2fr,1.5fr]">
			{backgroundImage && (
				<div
					className="absolute inset-0 bg-cover bg-center"
					style={{ backgroundImage: `url(${backgroundImage})` }}
				>
					<div className="absolute inset-0 bg-black/60"></div>
				</div>
			)}

			{/* Left Column */}
			<div className="relative flex h-full flex-col justify-center">
				<div className="absolute top-0 left-0 right-0 p-4 sm:p-8 md:p-12 flex justify-start items-center gap-4">
					<Settings {...globalSettingsProps} scope="global" />
					{visibility.greeting && <Greeting />}
				</div>

				<div className="flex flex-col items-center justify-center space-y-8 w-full max-w-xl mx-auto p-4 sm:p-8 md:p-12">
					{visibility.clock && <Clock />}
					{visibility.search && <Search />}
					{visibility.quickLinks && <QuickLinks />}
				</div>
			</div>


			{/* Right Column */}
			{visibility.learn && (
				<div className="relative flex flex-col h-screen overflow-hidden">
					<div className="flex flex-col w-full h-full">
						<Learn
							view={view}
							isLoading={isLoading}
							flashcardSet={flashcardSet}
							quizSet={quizSet}
							theorySet={theorySet}
							quizState={quizState}
							onQuizStateChange={handleQuizStateChange}
							onQuizReset={handleQuizReset}
							flashcardIndex={flashcardIndex}
							onFlashcardIndexChange={handleFlashcardIndexChange}
							onViewChange={handleViewChange}
							language={language}
							topic={topic}
							model={model}
							showQuizSummary={showQuizSummary}
							setShowQuizSummary={setShowQuizSummary}
							showFlashcardSummary={showFlashcardSummary}
							setShowFlashcardSummary={setShowFlashcardSummary}
							showTheorySummary={showTheorySummary}
							setShowTheorySummary={setShowTheorySummary}
							flashcardState={flashcardState}
							onFlashcardStateChange={handleFlashcardStateChange}
							onFlashcardReset={handleFlashcardReset}
							theoryState={theoryState}
							onTheoryStateChange={handleTheoryStateChange}
							onTheoryReset={handleTheoryReset}
							settingsProps={learnSettingsProps}
							currentQuestionIndex={currentQuestionIndex}
							onCurrentQuestionIndexChange={handleCurrentQuestionIndexChange}
							theoryChapterIndex={theoryChapterIndex}
							onTheoryChapterIndexChange={handleTheoryChapterIndexChange}
							apiKeys={apiKeys}
							apiKeyIndex={apiKeyIndex}
							onApiKeyIndexChange={handleApiKeyIndexChange}
							onOnboardingComplete={handleOnboardingComplete}
							hasCompletedOnboarding={hasCompletedOnboarding}
							handleGenerate={handleGenerate}
							handleGeneratePodcastForChapter={handleGeneratePodcastForChapter}
							isGeneratingPodcast={isGeneratingPodcast}
						/>
					</div>
				</div>
			)}
		</main>
	)
}

    

    

    


