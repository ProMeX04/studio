

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
} from "lucide-react"
import { Toolbar } from "@/components/Toolbar"
import { cn } from "@/lib/utils"


function HomePageContent() {
	const { 
		isMounted, 
		backgroundImage, 
		visibility, 
		onVisibilityChange,
		// Props for Toolbar Actions Logic
		view,
		theorySet,
		theoryState,
		theoryChapterIndex,
		onTheoryStateChange,
		showTheorySummary,
		setShowTheorySummary,
		flashcardSet,
		flashcardState,
		flashcardIndex,
		onFlashcardStateChange,
		showFlashcardSummary,
		setShowFlashcardSummary,
		quizSet,
		showQuizSummary,
		setShowQuizSummary,
	} = useAppContext()

	const panelGroupRef = useRef<ImperativePanelGroupHandle>(null)

	const handleOpenLeft = () => {
		const panelGroup = panelGroupRef.current
		if (panelGroup) {
			const layout = panelGroup.getLayout()
			// If right is closed, open both to 50/50. Otherwise, open left to 45.
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
			// If left is closed, open both to 50/50. Otherwise, open right to 55.
			if (layout[0] === 0) {
				panelGroup.setLayout([50, 50])
			} else {
				panelGroup.setLayout([layout[0], 55])
			}
		}
	}

	const renderToolbarActions = useMemo(() => {
		switch (view) {
			case 'theory': {
				const hasContent = (theorySet?.chapters.length ?? 0) > 0;
				const isSummaryActive = showTheorySummary;
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
				const hasContent = (flashcardSet?.cards.length ?? 0) > 0;
				const isSummaryActive = showFlashcardSummary;
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
				const hasContent = (quizSet?.questions.length ?? 0) > 0;
				const isSummaryActive = showQuizSummary;
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
		view,
		theorySet, theoryState, theoryChapterIndex, onTheoryStateChange, showTheorySummary, setShowTheorySummary,
		flashcardSet, flashcardState, flashcardIndex, onFlashcardStateChange, showFlashcardSummary, setShowFlashcardSummary,
		quizSet, showQuizSummary, setShowQuizSummary
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
					<Toolbar actions={renderToolbarActions} />
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
