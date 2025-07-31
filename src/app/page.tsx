
"use client"

import React, { useRef, useMemo } from "react"
import { AppProvider, useAppContext } from "@/contexts/AppContext"
import LeftColumn from "@/components/LeftColumn"
import RightColumn from "@/components/RightColumn"
import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "@/components/ui/resizable"
import type { ImperativePanelGroupHandle } from "react-resizable-panels"
import { Button } from "@/components/ui/button"
import { 
	PanelLeftOpen, 
	PanelRightOpen,
	Award,
	CheckCircle,
	ChevronLeft,
	ChevronRight,
} from "lucide-react"
import { Toolbar } from "@/components/Toolbar"
import { cn } from "@/lib/utils"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Settings } from "@/components/Settings";
import { AdvancedVoiceChat } from "@/components/AdvancedVoiceChat";

function HomePageContent() {
	const { 
		isMounted, 
		backgroundImage, 
		visibility, 
		onVisibilityChange,
		
		// Toolbar State & Logic
		view,
		onViewChange,
		flashcardSet,
		quizSet,
		theorySet,
		flashcardIndex,
		currentQuestionIndex,
		theoryChapterIndex,
		onFlashcardIndexChange,
		onCurrentQuestionIndexChange,
		onTheoryChapterIndexChange,
		showQuizSummary,
		showFlashcardSummary,
		showTheorySummary,

		// State for Action buttons
		theoryState,
		onTheoryStateChange,
		setShowTheorySummary,
		flashcardState,
		onFlashcardStateChange,
		setShowFlashcardSummary,
		quizState,
		setShowQuizSummary,

		// Settings props
		onBackgroundChange,
        onUploadedBackgroundsChange,
        uploadedBackgrounds,
        onSettingsSave,
        onGenerate,
        handleClearLearningData,
        isLoading,
        topic,
        language,
        model,
        onApiKeysChange,
        handleResetOnboarding,
        apiKeys,
        apiKeyIndex,
		handleApiKeyIndexChange,

	} = useAppContext()

	const panelGroupRef = useRef<ImperativePanelGroupHandle>(null)

	const handleOpenLeft = () => {
		const panelGroup = panelGroupRef.current
		if (panelGroup) {
			const layout = panelGroup.getLayout()
			if (layout[1] === 0) {
				panelGroup.setLayout([50, 50])
			} else {
				panelGroup.setLayout([45, layout[1]])
			}
		}
	}
	
	const handleOpenRight = () => {
		const panelGroup = panelGroupRef.current
		if (panelGroup) {
			const layout = panelGroup.getLayout()
			if (layout[0] === 0) {
				panelGroup.setLayout([50, 50])
			} else {
				panelGroup.setLayout([layout[0], 55])
			}
		}
	}

	const { totalItems, currentIndex, isNavDisabled } = useMemo(() => {
        let total = 0;
        let current = 0;
        switch (view) {
            case 'flashcards':
                total = flashcardSet?.cards.length ?? 0;
                current = flashcardIndex;
                break;
            case 'quiz':
                total = quizSet?.questions.length ?? 0;
                current = currentQuestionIndex;
                break;
            case 'theory':
                total = theorySet?.outline?.length ?? 0;
                current = theoryChapterIndex;
                break;
        }
        const hasContent = total > 0;
        const isSummaryActive = showQuizSummary || showFlashcardSummary || showTheorySummary;
        const navDisabled = isSummaryActive || !hasContent;

        return { totalItems: total, currentIndex: current, isNavDisabled: navDisabled };
    }, [view, flashcardSet, quizSet, theorySet, flashcardIndex, currentQuestionIndex, theoryChapterIndex, showQuizSummary, showFlashcardSummary, showTheorySummary]);

    const handleNext = () => {
        if (currentIndex < totalItems - 1) {
            switch (view) {
                case 'flashcards': onFlashcardIndexChange(currentIndex + 1); break;
                case 'quiz': onCurrentQuestionIndexChange(currentIndex + 1); break;
                case 'theory': onTheoryChapterIndexChange(currentIndex + 1); break;
            }
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            switch (view) {
                case 'flashcards': onFlashcardIndexChange(currentIndex - 1); break;
                case 'quiz': onCurrentQuestionIndexChange(currentIndex - 1); break;
                case 'theory': onTheoryChapterIndexChange(currentIndex - 1); break;
            }
        }
    };

	const renderToolbarActions = useMemo(() => {
		const hasContent = totalItems > 0;
		const isSummaryActive = showQuizSummary || showFlashcardSummary || showTheorySummary;

		switch (view) {
			case 'theory': {
				const isCurrentItemUnderstood = theoryState?.understoodIndices.includes(theoryChapterIndex) ?? false;
				const handleToggleUnderstood = () => {
					if (!theoryState) return;
					const newUnderstoodIndices = [...theoryState.understoodIndices];
					const indexPosition = newUnderstoodIndices.indexOf(theoryChapterIndex);
					if (indexPosition > -1) {
						newUnderstoodIndices.splice(indexPosition, 1);
					} else {
						newUnderstoodIndices.push(theoryChapterIndex);
					}
					onTheoryStateChange({ understoodIndices: newUnderstoodIndices });
				};
				return (
					<>
						<Button onClick={handleToggleUnderstood} disabled={!hasContent || isSummaryActive} variant={isCurrentItemUnderstood ? "default" : "outline"} size="icon" className="h-9 w-9">
							<CheckCircle className="w-4 h-4" />
						</Button>
						<Button onClick={() => setShowTheorySummary(true)} disabled={!hasContent || isSummaryActive} variant="outline" size="icon" className="h-9 w-9">
							<Award className="w-4 h-4" />
						</Button>
					</>
				);
			}
			case 'flashcards': {
				const isCurrentItemUnderstood = flashcardState?.understoodIndices.includes(flashcardIndex) ?? false;
				const handleToggleUnderstood = () => {
					if (!flashcardState) return;
					const newUnderstoodIndices = [...flashcardState.understoodIndices];
					const indexPosition = newUnderstoodIndices.indexOf(flashcardIndex);
					if (indexPosition > -1) {
						newUnderstoodIndices.splice(indexPosition, 1);
					} else {
						newUnderstoodIndices.push(flashcardIndex);
					}
					onFlashcardStateChange({ understoodIndices: newUnderstoodIndices });
				};
				return (
					<>
						<Button onClick={handleToggleUnderstood} disabled={!hasContent || isSummaryActive} variant={isCurrentItemUnderstood ? "default" : "outline"} size="icon" className="h-9 w-9">
							<CheckCircle className="w-4 h-4" />
						</Button>
						<Button onClick={() => setShowFlashcardSummary(true)} disabled={!hasContent || isSummaryActive} variant="outline" size="icon" className="h-9 w-9">
							<Award className="w-4 h-4" />
						</Button>
					</>
				);
			}
			case 'quiz': {
				return (
					<Button onClick={() => setShowQuizSummary(true)} disabled={!hasContent || isSummaryActive} variant="outline" size="icon" className="h-9 w-9">
						<Award className="h-4 w-4" />
					</Button>
				);
			}
			default:
				return null;
		}
	}, [
		view, totalItems, showQuizSummary, showFlashcardSummary, showTheorySummary,
		theorySet, theoryState, theoryChapterIndex, onTheoryStateChange, setShowTheorySummary,
		flashcardSet, flashcardState, flashcardIndex, onFlashcardStateChange, setShowFlashcardSummary,
		quizSet, setShowQuizSummary
	]);

	const settingsProps = {
        scope: "all" as const,
        onVisibilityChange,
        onBackgroundChange,
        onUploadedBackgroundsChange,
        visibility,
        uploadedBackgrounds,
        currentBackgroundImage: backgroundImage,
        onSettingsChange: onSettingsSave,
        onGenerate,
        onClearLearningData: handleClearLearningData,
        isLoading,
        topic,
        language,
        model,
        onApiKeysChange,
        onResetOnboarding: handleResetOnboarding,
        apiKeys,
        theorySet,
        flashcardSet,
        quizSet,
    };

    const voiceChatProps = {
        apiKeys,
        apiKeyIndex,
        onApiKeyIndexChange: handleApiKeyIndexChange,
    };


	if (!isMounted) {
		return null
	}
	
	const toolbarComponents = [
		<Select
			key="view-select"
			value={view}
			onValueChange={(value) => onViewChange(value as any)}
		>
			<SelectTrigger className="w-[150px]">
				<SelectValue placeholder="Chọn chế độ" />
			</SelectTrigger>
			<SelectContent>
				<SelectItem value="theory">Lý thuyết</SelectItem>
				<SelectItem value="flashcards">Flashcard</SelectItem>
				<SelectItem value="quiz">Trắc nghiệm</SelectItem>
			</SelectContent>
		</Select>,
	
		<div key="nav-controls" className="flex items-center gap-2">
			<Button
				onClick={handlePrev}
				disabled={isNavDisabled || currentIndex === 0}
				variant="outline"
				size="icon"
				className="h-9 w-9"
			>
				<ChevronLeft className="h-4 w-4" />
			</Button>
	
			<span className="text-sm text-muted-foreground w-24 text-center">
				{view === "flashcards" ? "Thẻ" : view === "quiz" ? "Câu hỏi" : "Chương"}{" "}
				{totalItems > 0 ? currentIndex + 1 : 0} / {totalItems}
			</span>
	
			<Button
				onClick={handleNext}
				disabled={isNavDisabled || currentIndex >= totalItems - 1}
				variant="outline"
				size="icon"
				className="h-9 w-9"
			>
				<ChevronRight className="h-4 w-4" />
			</Button>
	
			{renderToolbarActions}
	
			<Settings {...settingsProps} />
	
			{visibility.advancedVoiceChat && (
				<AdvancedVoiceChat {...voiceChatProps} />
			)}
		</div>
	];


	return (
		<main className="relative min-h-screen w-full flex flex-col">
			{backgroundImage && (
				<div
					className="absolute inset-0 bg-cover bg-center -z-10"
					style={{ backgroundImage: `url(${backgroundImage})` }}
				>
					<div className="absolute inset-0 bg-black/60"></div>
				</div>
			)}
			
			<div className="flex-grow">
				<ResizablePanelGroup 
					ref={panelGroupRef}
					direction="horizontal" 
					className="relative min-h-full w-full"
					autoSaveId="newtab-ai-layout-v2"
					onLayout={(sizes: number[]) => {
						const newVisibility = {
							...visibility,
							home: sizes[0] > 0,
							learn: sizes[1] > 0,
						};
						if (JSON.stringify(newVisibility) !== JSON.stringify(visibility)) {
							onVisibilityChange(newVisibility);
						}
					}}
				>
					<ResizablePanel 
						collapsible={true}
						collapsedSize={0}
						minSize={30}
						className={cn(!visibility.home && "min-w-0")}
					>
						<LeftColumn />
					</ResizablePanel>

					<ResizableHandle className="bg-transparent" />
					
					<ResizablePanel 
						collapsible={true}
						collapsedSize={0}
						minSize={30}
						className={cn(!visibility.learn && "min-w-0")}
					>
						<RightColumn />
					</ResizablePanel>
				</ResizablePanelGroup>
			</div>
			
			<div className="absolute bottom-0 left-0 right-0 flex justify-between items-center p-2 z-40">
				<div className="flex-1 flex justify-start">
					{!visibility.home && (
						<div className="bg-background/30 backdrop-blur-sm p-2 rounded-md">
							<Button
								variant="outline"
								size="icon"
								className="h-9 w-9"
								onClick={handleOpenLeft}
							>
								<PanelLeftOpen className="h-4 w-4" />
							</Button>
						</div>
					)}
				</div>

				<div className="flex-shrink-0">
					<Toolbar components={toolbarComponents} />
				</div>

				<div className="flex-1 flex justify-end">
					{!visibility.learn && (
						<div className="bg-background/30 backdrop-blur-sm p-2 rounded-md">
							<Button
								variant="outline"
								size="icon"
								className="h-9 w-9"
								onClick={handleOpenRight}
							>
								<PanelRightOpen className="h-4 w-4" />
							</Button>
						</div>
					)}
				</div>
			</div>
		</main>
	)
}

export default function Home() {
	return (
		<AppProvider>
			<HomePageContent />
		</AppProvider>
	)
}
