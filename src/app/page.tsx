
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
} from "lucide-react"
import { Toolbar } from "@/components/Toolbar"
import { cn } from "@/lib/utils"
import type { ToolbarItemConfig } from "@/app/types"

function HomePageContent() {
	const { 
		isMounted, 
		backgroundImage, 
		visibility, 
		onVisibilityChange,
		
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

		theoryState,
		onTheoryStateChange,
		setShowTheorySummary,
		flashcardState,
		onFlashcardStateChange,
		setShowFlashcardSummary,
		setShowQuizSummary,

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

	const toolbarConfig: ToolbarItemConfig[] = useMemo(() => {
		const hasTheoryContent = theorySet && theorySet.chapters.length > 0;
		const hasFlashcardContent = flashcardSet && flashcardSet.cards.length > 0;
		const hasQuizContent = quizSet && quizSet.questions.length > 0;
		const isSummaryActive = showQuizSummary || showFlashcardSummary || showTheorySummary;
	
		let totalItems = 0;
		let currentIndex = 0;
		let contentType = "";
	
		switch (view) {
			case 'flashcards':
				totalItems = flashcardSet?.cards.length ?? 0;
				currentIndex = flashcardIndex;
				contentType = "Thẻ";
				break;
			case 'quiz':
				totalItems = quizSet?.questions.length ?? 0;
				currentIndex = currentQuestionIndex;
				contentType = "Câu hỏi";
				break;
			case 'theory':
				totalItems = theorySet?.outline?.length ?? 0;
				currentIndex = theoryChapterIndex;
				contentType = "Chương";
				break;
		}

		const isCurrentTheoryUnderstood = theoryState?.understoodIndices.includes(theoryChapterIndex) ?? false;
		const isCurrentFlashcardUnderstood = flashcardState?.understoodIndices.includes(flashcardIndex) ?? false;
	
		const navDisabled = isSummaryActive || totalItems === 0;
		
		const baseConfig: ToolbarItemConfig[] = [
			{
				id: 'view-select',
				component: 'SelectView',
				props: { value: view, onValueChange: onViewChange }
			},
			{
				id: 'nav-controls',
				component: 'NavControls',
				props: {
					onPrev: () => {
						if (currentIndex > 0) {
							switch (view) {
								case 'flashcards': onFlashcardIndexChange(currentIndex - 1); break;
								case 'quiz': onCurrentQuestionIndexChange(currentIndex - 1); break;
								case 'theory': onTheoryChapterIndexChange(currentIndex - 1); break;
							}
						}
					},
					onNext: () => {
						if (currentIndex < totalItems - 1) {
							switch (view) {
								case 'flashcards': onFlashcardIndexChange(currentIndex + 1); break;
								case 'quiz': onCurrentQuestionIndexChange(currentIndex + 1); break;
								case 'theory': onTheoryChapterIndexChange(currentIndex + 1); break;
							}
						}
					},
					isDisabled: navDisabled,
					isPrevDisabled: currentIndex === 0,
					isNextDisabled: currentIndex >= totalItems - 1,
					label: `${contentType} ${totalItems > 0 ? currentIndex + 1 : 0} / ${totalItems}`
				}
			},
			{
				id: 'view-actions',
				component: 'ViewActions',
				props: {
					view,
					isSummaryActive,
					hasTheoryContent,
					hasFlashcardContent,
					hasQuizContent,
					isCurrentTheoryUnderstood,
					isCurrentFlashcardUnderstood,
					onToggleTheoryUnderstood: () => {
						if (!theoryState) return;
						const newUnderstoodIndices = [...theoryState.understoodIndices];
						const indexPosition = newUnderstoodIndices.indexOf(theoryChapterIndex);
						if (indexPosition > -1) {
							newUnderstoodIndices.splice(indexPosition, 1);
						} else {
							newUnderstoodIndices.push(theoryChapterIndex);
						}
						onTheoryStateChange({ understoodIndices: newUnderstoodIndices });
					},
					onShowTheorySummary: () => setShowTheorySummary(true),
					onToggleFlashcardUnderstood: () => {
						if (!flashcardState) return;
						const newUnderstoodIndices = [...flashcardState.understoodIndices];
						const indexPosition = newUnderstoodIndices.indexOf(flashcardIndex);
						if (indexPosition > -1) {
							newUnderstoodIndices.splice(indexPosition, 1);
						} else {
							newUnderstoodIndices.push(flashcardIndex);
						}
						onFlashcardStateChange({ understoodIndices: newUnderstoodIndices });
					},
					onShowFlashcardSummary: () => setShowFlashcardSummary(true),
					onShowQuizSummary: () => setShowQuizSummary(true),
				}
			},
			{
				id: 'settings',
				component: 'Settings',
				props: {
					scope: "all",
					onVisibilityChange, onBackgroundChange, onUploadedBackgroundsChange,
					visibility, uploadedBackgrounds, currentBackgroundImage: backgroundImage,
					onSettingsChange: onSettingsSave, onGenerate, onClearLearningData: handleClearLearningData,
					isLoading, topic, language, model,
					onApiKeysChange, onResetOnboarding: handleResetOnboarding, apiKeys,
					theorySet, flashcardSet, quizSet,
				}
			}
		];

		if (visibility.advancedVoiceChat) {
			baseConfig.push({
				id: 'voice-chat',
				component: 'AdvancedVoiceChat',
				props: {
					apiKeys,
					apiKeyIndex,
					onApiKeyIndexChange: handleApiKeyIndexChange,
				}
			});
		}

		return baseConfig;

	}, [
		view, flashcardSet, quizSet, theorySet, flashcardIndex, currentQuestionIndex, theoryChapterIndex,
		showQuizSummary, showFlashcardSummary, showTheorySummary, theoryState, flashcardState,
		visibility, backgroundImage, uploadedBackgrounds, isLoading, topic, language, model, apiKeys, apiKeyIndex,
		onViewChange, onFlashcardIndexChange, onCurrentQuestionIndexChange, onTheoryChapterIndexChange,
		onTheoryStateChange, setShowTheorySummary, onFlashcardStateChange, setShowFlashcardSummary, setShowQuizSummary,
		onVisibilityChange, onBackgroundChange, onUploadedBackgroundsChange, onSettingsSave, onGenerate,
		handleClearLearningData, onApiKeysChange, handleResetOnboarding, handleApiKeyIndexChange
	]);


	if (!isMounted) {
		return null
	}

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
					<Toolbar config={toolbarConfig} />
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
