

"use client"

import React, { useRef, useMemo, ReactNode } from "react"
import { AppProvider, useAppContext } from "@/contexts/AppContext"
import { Login } from "@/components/Login"
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
	CheckCircle,
	Award,
} from "lucide-react"
import { Toolbar } from "@/components/Toolbar"
import { cn } from "@/lib/utils"
import type { ToolbarItemConfig } from "@/app/types"
import { Settings } from "@/components/Settings"

function HomePageContent() {
	const { 
		isMounted, 
		user,
		loading,
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
	} = useAppContext();

	const panelGroupRef = useRef<ImperativePanelGroupHandle>(null)

	const hasLearningData = useMemo(() => {
		return !!(theorySet || flashcardSet || quizSet);
	}, [theorySet, flashcardSet, quizSet]);

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
		const hasTheoryContent = (theorySet?.chapters?.length ?? 0) > 0;
		const hasFlashcardContent = (flashcardSet?.cards?.length ?? 0) > 0;
		const hasQuizContent = (quizSet?.questions?.length ?? 0) > 0;
		const isSummaryActive = showQuizSummary || showFlashcardSummary || showTheorySummary;

		const navConfig = {
			flashcards: {
				total: (flashcardSet?.cards?.length ?? 0),
				current: flashcardIndex,
				label: "Thẻ",
				onPrev: () => onFlashcardIndexChange(flashcardIndex - 1),
				onNext: () => onFlashcardIndexChange(flashcardIndex + 1),
			},
			quiz: {
				total: (quizSet?.questions?.length ?? 0),
				current: currentQuestionIndex,
				label: "Câu hỏi",
				onPrev: () => onCurrentQuestionIndexChange(currentQuestionIndex - 1),
				onNext: () => onCurrentQuestionIndexChange(currentQuestionIndex + 1),
			},
			theory: {
				total: (theorySet?.outline?.length ?? 0),
				current: theoryChapterIndex,
				label: "Chương",
				onPrev: () => onTheoryChapterIndexChange(theoryChapterIndex - 1),
				onNext: () => onTheoryChapterIndexChange(theoryChapterIndex + 1),
			},
		};

		const { total, current, label, onPrev, onNext } = navConfig[view];
		const navDisabled = isSummaryActive || total === 0;

		const viewActions: { [key: string]: ReactNode } = {
			theory: (
				<>
					<Button
						onClick={() => {
							if (!theoryState) return;
							const newUnderstoodIndices = [...theoryState.understoodIndices];
							const indexPosition = newUnderstoodIndices.indexOf(theoryChapterIndex);
							if (indexPosition > -1) {
								newUnderstoodIndices.splice(indexPosition, 1);
							} else {
								newUnderstoodIndices.push(theoryChapterIndex);
							}
							onTheoryStateChange({ understoodIndices: newUnderstoodIndices });
						}}
						disabled={!hasTheoryContent || isSummaryActive}
						variant={theoryState?.understoodIndices.includes(theoryChapterIndex) ? "default" : "outline"}
						size="icon"
						className="h-9 w-9"
					>
						<CheckCircle className="w-4 h-4" />
					</Button>
					<Button onClick={() => setShowTheorySummary(true)} disabled={!hasTheoryContent || isSummaryActive} variant="outline" size="icon" className="h-9 w-9">
						<Award className="w-4 h-4" />
					</Button>
				</>
			),
			flashcards: (
				<>
					<Button
						onClick={() => {
							if (!flashcardState) return;
							const newUnderstoodIndices = [...flashcardState.understoodIndices];
							const indexPosition = newUnderstoodIndices.indexOf(flashcardIndex);
							if (indexPosition > -1) {
								newUnderstoodIndices.splice(indexPosition, 1);
							} else {
								newUnderstoodIndices.push(flashcardIndex);
							}
							onFlashcardStateChange({ understoodIndices: newUnderstoodIndices });
						}}
						disabled={!hasFlashcardContent || isSummaryActive}
						variant={flashcardState?.understoodIndices.includes(flashcardIndex) ? "default" : "outline"}
						size="icon"
						className="h-9 w-9"
					>
						<CheckCircle className="w-4 h-4" />
					</Button>
					<Button onClick={() => setShowFlashcardSummary(true)} disabled={!hasFlashcardContent || isSummaryActive} variant="outline" size="icon" className="h-9 w-9">
						<Award className="w-4 h-4" />
					</Button>
				</>
			),
			quiz: (
				<Button onClick={() => setShowQuizSummary(true)} disabled={!hasQuizContent || isSummaryActive} variant="outline" size="icon" className="h-9 w-9">
					<Award className="h-4 w-4" />
				</Button>
			),
		};

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
					onPrev,
					onNext,
					isDisabled: navDisabled,
					isPrevDisabled: current === 0,
					isNextDisabled: current >= total - 1,
					label: `${label} ${total > 0 ? current + 1 : 0} / ${total}`
				}
			},
			{
				id: 'view-actions',
				component: 'Custom',
				props: {
					children: viewActions[view] || null
				}
			},
		];

		if (visibility.advancedVoiceChat) {
			baseConfig.push({
				id: 'voice-chat',
				component: 'AdvancedVoiceChat',
				props: {}
			});
		}

		return baseConfig;

	}, [
		view, onViewChange, flashcardSet, quizSet, theorySet, flashcardIndex, onFlashcardIndexChange, currentQuestionIndex, 
		onCurrentQuestionIndexChange, theoryChapterIndex, onTheoryChapterIndexChange, showQuizSummary, setShowQuizSummary, 
		showFlashcardSummary, setShowFlashcardSummary, showTheorySummary, setShowTheorySummary, theoryState, 
		onTheoryStateChange, flashcardState, onFlashcardStateChange, visibility.advancedVoiceChat
	]);


	if (!isMounted) {
		return null
	}

	// Show loading while checking authentication
	if (loading) {
		return (
			<div className="min-h-screen w-full flex items-center justify-center">
				<div className="text-lg">Đang tải...</div>
			</div>
		)
	}

	// Show login screen if user is not authenticated
	if (!user) {
		return <Login />
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
			
			<div className="absolute bottom-0 left-0 right-0 flex justify-between items-end p-2 z-40 pointer-events-none">
				<div className="flex-1 flex justify-start">
					{!visibility.home && (
						<div className="bg-background/30 backdrop-blur-sm p-2 rounded-md pointer-events-auto">
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

				<div className="flex-shrink-0 pointer-events-auto">
					{hasLearningData && (
						<Toolbar config={toolbarConfig} />
					)}
				</div>

				<div className="flex-1 flex justify-end items-center gap-2">
					{!visibility.learn && (
						<div className="bg-background/30 backdrop-blur-sm p-2 rounded-md pointer-events-auto">
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
					<div className="bg-background/30 backdrop-blur-sm p-2 rounded-md pointer-events-auto">
						<Settings scope="all" />
					</div>
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
