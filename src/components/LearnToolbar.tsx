
"use client"

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Settings } from "@/components/Settings"
import { ChevronLeft, ChevronRight, Award, CheckCircle } from "lucide-react"
import type { ViewType } from "@/app/page"

interface LearnToolbarProps {
	view: ViewType
	onViewChange: (view: ViewType) => void
	currentIndex: number
	totalItems: number
	hasContent: boolean
	isNavDisabled: boolean
	isSummaryActive: boolean
	isCurrentItemUnderstood: boolean
	handlePrev: () => void
	handleNext: () => void
	handleToggleUnderstood: () => void
	setShowFlashcardSummary: (show: boolean) => void
	setShowTheorySummary: (show: boolean) => void
	setShowQuizSummary: (show: boolean) => void
	settingsProps: any
}

export function LearnToolbar({
	view,
	onViewChange,
	currentIndex,
	totalItems,
	hasContent,
	isNavDisabled,
	isSummaryActive,
	isCurrentItemUnderstood,
	handlePrev,
	handleNext,
	handleToggleUnderstood,
	setShowFlashcardSummary,
	setShowTheorySummary,
	setShowQuizSummary,
	settingsProps,
}: LearnToolbarProps) {
	return (
		<div className="absolute bottom-0 left-0 right-0 flex justify-center p-4">
				<div className="flex flex-wrap items-center justify-center gap-4 bg-background/30 backdrop-blur-sm p-2 rounded-md w-full max-w-2xl">
						<Tabs
							value={view}
							onValueChange={(value) => onViewChange(value as ViewType)}
							className="w-auto"
						>
							<TabsList>
								<TabsTrigger value="theory">Lý thuyết</TabsTrigger>
								<TabsTrigger value="flashcards">Flashcard</TabsTrigger>
								<TabsTrigger value="quiz">Trắc nghiệm</TabsTrigger>
							</TabsList>
						</Tabs>

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
							
							{(view === 'flashcards' || view === 'theory') && (
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
										onClick={() => view === 'flashcards' ? setShowFlashcardSummary(true) : setShowTheorySummary(true)}
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
	)
}
