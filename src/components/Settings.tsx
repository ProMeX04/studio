

"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
	Settings as SettingsIcon,
	CheckCircle,
	Upload,
	Trash2,
	RefreshCw,
	AlertTriangle,
	Brush,
	BookOpen,
	KeyRound,
	Plus,
	X,
	Loader,
	ExternalLink,
	HelpCircle,
	Menu,
	Save,
	BrainCircuit,
	Minus,
	Mic,
} from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
	SheetFooter,
	SheetClose,
} from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "./ui/separator"
import type { ComponentVisibility } from "@/contexts/AppContext"
import { Switch } from "./ui/switch"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "./ui/select"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { getDb } from "@/lib/idb"
import { Progress } from "@/components/ui/progress"
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "./ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import type { CardSet, QuizSet, TheorySet } from "@/ai/schemas"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type SettingsScope = "all" | "learn-onboarding"

interface CommonSettingsProps {
	scope: SettingsScope
}

interface AllSettingsProps {
	scope: "all"
	onVisibilityChange: (visibility: ComponentVisibility) => void
	onBackgroundChange: (background: string | null) => void
	onUploadedBackgroundsChange: (backgrounds: string[]) => void
	visibility: ComponentVisibility
	uploadedBackgrounds: string[]
	currentBackgroundImage: string | null
	onGenerate?: (forceNew: boolean) => void
	onApiKeysChange: (apiKeys: string[]) => void
	onResetOnboarding: () => void
	isLoading: boolean
	apiKeys: string[]
	theorySet: TheorySet | null
	flashcardSet: CardSet | null
	quizSet: QuizSet | null
	onSettingsChange: (settings: {
		topic: string
		language: string
		model: string
	}) => void
	topic: string
	language: string
	model: string
	onClearLearningData: () => void
	generationProgress: any;
}

// A more limited version of LearnSettingsProps for onboarding
interface LearnOnboardingSettingsProps {
	scope: "learn-onboarding"
	onApiKeysChange: (apiKeys: string[]) => void
	onSettingsChanged: () => void // For onboarding
	apiKeys: string[]
	isLoading: boolean
}

type SettingsProps = CommonSettingsProps &
	(AllSettingsProps | LearnOnboardingSettingsProps)

export const languages = [
	{ value: "Vietnamese", label: "Tiếng Việt" },
	{ value: "English", label: "English" },
	{ value: "Spanish", label: "Español" },
	{ value: "French", label: "Français" },
	{ value: "German", label: "Deutsch" },
	{ value: "Japanese", label: "日本語" },
	{ value: "Korean", label: "한국어" },
]

export const models = [
	{
		value: "gemini-2.5-flash-lite",
		label: "Gemini 2.5 Flash Lite(Nhanh, Hiệu quả)",
	},
	{
		value: "gemini-2.5-pro",
		label: "Gemini 2.5 Pro (Mạnh mẽ, Chính xác)",
	},
]

const MAX_UPLOADED_IMAGES = 6

import { useAppContext } from "@/contexts/AppContext"

export function Settings(props: SettingsProps) {
	const { scope } = props
	const { registerToolbarItem, unregisterToolbarItem } = useAppContext()
	const isOnboardingScope = scope.startsWith("learn-onboarding")
	const { toast } = useToast()
	const [isSheetOpen, setIsSheetOpen] = useState(false)

	// Local state for API keys (now managed in learn settings)
	const [localApiKeys, setLocalApiKeys] = useState<string[]>(
		scope.startsWith("learn") || scope === "all"
			? (props as AllSettingsProps | LearnOnboardingSettingsProps).apiKeys
			: []
	)
	const [newApiKey, setNewApiKey] = useState("")

	const fileInputRef = useRef<HTMLInputElement>(null)

	const allProps = scope === "all" ? (props as AllSettingsProps) : undefined

	// Sync local state with props when the sheet opens or props change
	useEffect(() => {
		if (scope === "all") {
			const allProps = props as AllSettingsProps
			if (isSheetOpen) {
				setLocalApiKeys(allProps.apiKeys)
			}
		} else if (isOnboardingScope) {
			const learnProps = props as LearnOnboardingSettingsProps
			setLocalApiKeys(learnProps.apiKeys)
		}
	}, [props, scope, isSheetOpen, isOnboardingScope])

	useEffect(() => {
		if (scope === "all") {
			const item = {
				id: "settings",
				component: (
					<Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
						<SheetTrigger asChild>
							<Button
								variant="outline"
								size="icon"
								className="h-9 w-9"
							>
								<Menu />
								<span className="sr-only">Cài đặt</span>
							</Button>
						</SheetTrigger>
						<SheetContent
							side="right"
							className="flex flex-col max-h-[100vh] w-[400px] sm:max-w-[540px]"
						>
							<SheetHeader>
								<SheetTitle>
									<div className="flex items-center gap-2">
										<SettingsIcon />
										<span>Cài đặt</span>
									</div>
								</SheetTitle>
							</SheetHeader>

							<Tabs
								defaultValue="learn"
								className="flex-grow flex flex-col mt-4"
							>
								<TabsList className="w-full">
									<TabsTrigger
										value="learn"
										className="flex-1"
									>
										Học tập
									</TabsTrigger>
									<TabsTrigger
										value="global"
										className="flex-1"
									>
										Giao diện
									</TabsTrigger>
								</TabsList>
								<TabsContent
									value="learn"
									className="flex-grow overflow-y-auto pr-6 pl-1 -mr-6 mt-4"
								>
									<div className="grid gap-6">
										{renderLearnSettings()}
									</div>
								</TabsContent>
								<TabsContent
									value="global"
									className="flex-grow overflow-y-auto pr-6 pl-1 -mr-6 mt-4"
								>
									<div className="grid gap-6">
										{renderGlobalSettings()}
									</div>
								</TabsContent>
							</Tabs>

							<SheetFooter className="mt-auto pt-4 border-t">
								<AlertDialog>
									<AlertDialogTrigger asChild>
										<Button
											variant="destructive"
											className="w-full"
										>
											<RefreshCw className="mr-2 h-4 w-4" />
											Tạo chủ đề mới
										</Button>
									</AlertDialogTrigger>
									<AlertDialogContent>
										<AlertDialogHeader>
											<AlertDialogTitle>
												<div className="flex items-center gap-2">
													<AlertTriangle className="text-destructive" />
													<span>Tạo chủ đề mới?</span>
												</div>
											</AlertDialogTitle>
											<AlertDialogDescription>
												Hành động này sẽ xóa vĩnh viễn
												tất cả dữ liệu học tập hiện tại
												(lý thuyết, flashcard, trắc
												nghiệm) và bắt đầu lại quá
												trình tạo chủ đề mới. Cài đặt
												chung của bạn sẽ được giữ lại.
												Bạn có chắc chắn muốn tiếp tục
												không?
											</AlertDialogDescription>
										</AlertDialogHeader>
										<AlertDialogFooter>
											<AlertDialogCancel>
												Hủy
											</AlertDialogCancel>
											<AlertDialogAction
												onClick={handleResetOnboarding}
												className={cn(
													buttonVariants({
														variant: "destructive",
													})
												)}
											>
												Vâng, tạo mới
											</AlertDialogAction>
										</AlertDialogFooter>
									</AlertDialogContent>
								</AlertDialog>
							</SheetFooter>
						</SheetContent>
					</Sheet>
				),
				area: "center",
				order: 8,
			}
			registerToolbarItem(item)
		}

		return () => {
			if (scope === "all") {
				unregisterToolbarItem("settings")
			}
		}
	}, [
		scope,
		registerToolbarItem,
		unregisterToolbarItem,
		isSheetOpen,
		setIsSheetOpen,
		props,
	])

	const handleAddNewApiKey = () => {
		if (!scope.startsWith("learn") && scope !== "all") return
		if (newApiKey.trim()) {
			if (!localApiKeys.includes(newApiKey.trim())) {
				const newKeys = [...localApiKeys, newApiKey.trim()]
				setLocalApiKeys(newKeys)
				;(
					props as AllSettingsProps | LearnOnboardingSettingsProps
				).onApiKeysChange(newKeys)
			}
			setNewApiKey("")
		}
	}

	const handleRemoveApiKey = (keyToRemove: string) => {
		if (!scope.startsWith("learn") && scope !== "all") return
		const newKeys = localApiKeys.filter((key) => key !== keyToRemove)
		setLocalApiKeys(newKeys)
		;(
			props as AllSettingsProps | LearnOnboardingSettingsProps
		).onApiKeysChange(newKeys)
	}

	const handleGenerate = (forceNew: boolean) => {
		if (scope === "all") {
			const currentProps = props as AllSettingsProps
			if (currentProps.onGenerate) {
				currentProps.onGenerate(forceNew)
			}
		}
	}

	const handleResetOnboarding = () => {
		if (scope === "all") {
			const allProps = props as AllSettingsProps
			allProps.onResetOnboarding()
		}
	}

	const handleBackgroundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (scope === "all") {
			const allProps = props as AllSettingsProps
			const file = e.target.files?.[0]
			if (file) {
				const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
				if (file.size > MAX_FILE_SIZE) {
					toast({
						title: "Lỗi tải lên",
						description:
							"File quá lớn! Vui lòng chọn ảnh nhỏ hơn 10MB.",
						variant: "destructive",
					})
					return
				}
				const reader = new FileReader()
				reader.onload = (event) => {
					const result = event.target?.result as string
					const newUploadedBgs = [
						result,
						...allProps.uploadedBackgrounds,
					].slice(0, MAX_UPLOADED_IMAGES)
					allProps.onUploadedBackgroundsChange(newUploadedBgs)
					allProps.onBackgroundChange(result)
				}
				reader.readAsDataURL(file)
			}
		}
	}

	const renderApiKeyManagement = () => {
		if (!scope.startsWith("learn") && scope !== "all") return null
		const learnProps = props as
			| LearnOnboardingSettingsProps
			| AllSettingsProps

		return (
			<div className="space-y-2">
				<div className="flex gap-2 pt-2">
					<Input
						id="newApiKey"
						value={newApiKey}
						onChange={(e) => setNewApiKey(e.target.value)}
						placeholder="Dán API key mới vào đây"
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								e.preventDefault()
								handleAddNewApiKey()
							}
						}}
					/>
					<Button
						onClick={handleAddNewApiKey}
						variant="outline"
						size="icon"
					>
						<Plus className="w-4 h-4" />
					</Button>
				</div>

				<div className="space-y-2 mt-2 rounded-md border max-h-48 overflow-y-auto p-2">
					{localApiKeys.length > 0 ? (
						localApiKeys.map((key, index) => (
							<div
								key={index}
								className="flex items-center justify-between gap-2 bg-secondary p-2 rounded-md"
							>
								<span className="truncate text-sm text-secondary-foreground font-mono">
									...{key.slice(-8)}
								</span>
								<Button
									size="icon"
									variant="ghost"
									className="h-6 w-6"
									onClick={() => handleRemoveApiKey(key)}
								>
									<X className="w-4 h-4" />
								</Button>
							</div>
						))
					) : (
						<p className="text-xs text-muted-foreground text-center p-2">
							Chưa có API key nào.
						</p>
					)}
				</div>

				{scope === "learn-onboarding" && (
					<Button
						onClick={() => {
                            const currentProps = props as LearnOnboardingSettingsProps;
                            if (localApiKeys.length > 0) {
                                currentProps.onSettingsChanged();
                            } else {
                                toast({
                                    title: "Yêu cầu API Key",
                                    description: "Vui lòng thêm ít nhất một API key để tiếp tục.",
                                    variant: "destructive"
                                });
                            }
                        }}
						disabled={localApiKeys.length === 0 || learnProps.isLoading}
						className="w-full mt-4 h-12"
					>
                        {learnProps.isLoading ? (
                            <>
                                <Loader className="animate-spin mr-2 h-4 w-4" />
                                Đang tạo...
                            </>
                        ) : (
                            "Bắt đầu học"
                        )}
					</Button>
				)}
			</div>
		)
	}

	const renderContentGenerationControls = () => {
		if (scope !== "all" || !allProps) return null;
	
		const { isLoading, theorySet, flashcardSet, quizSet, generationProgress } = allProps;
	
		const theoryCount = theorySet?.chapters.filter(c => c.content).length ?? 0;
		const theoryMax = theorySet?.outline.length ?? 0;
		const flashcardCount = flashcardSet?.cards.length ?? 0;
		const quizCount = quizSet?.questions.length ?? 0;
	
		const isCompleted = generationProgress?.currentStage === 'done';
	
		let progressPercent = 0;
		if (theoryMax > 0 && generationProgress) {
			const STAGES = ['theory', 'flashcards', 'quiz'];
			const chapterProgress = generationProgress.currentChapterIndex / theoryMax;
			const stageIndex = STAGES.indexOf(generationProgress.currentStage);
			
			// Each stage is 1/3 of a chapter's progress.
			const stageProgress = (stageIndex >= 0 ? stageIndex : 2) / STAGES.length;
			
			// Total progress is progress of completed chapters + progress within the current chapter.
			progressPercent = (chapterProgress + (stageProgress / theoryMax)) * 100;

			if(generationProgress.currentStage === 'done') {
				progressPercent = 100;
			}
		}
	
		return (
			<div className="space-y-4">
				<Label className="font-medium text-foreground">Quản lý nội dung học tập</Label>
	
				<div className="p-4 bg-secondary/30 rounded-lg space-y-3">
					<div className="flex justify-between items-center">
						<Label htmlFor="theory-progress" className="text-sm">Tiến độ tổng</Label>
						<span className="text-sm text-muted-foreground">{progressPercent.toFixed(0)}%</span>
					</div>
					<Progress value={progressPercent} id="total-progress" />
	
					<div className="flex justify-between items-center text-sm pt-2">
						<Label>Lý thuyết</Label>
						<span className="text-muted-foreground">{theoryCount} / {theoryMax > 0 ? theoryMax : "?"} chương</span>
					</div>
					<div className="flex justify-between items-center text-sm">
						<Label>Flashcard</Label>
						<span className="text-muted-foreground">{flashcardCount} thẻ</span>
					</div>
					<div className="flex justify-between items-center text-sm">
						<Label>Trắc nghiệm</Label>
						<span className="text-muted-foreground">{quizCount} câu</span>
					</div>
	
					<Button
						className="w-full"
						onClick={() => handleGenerate(false)}
						disabled={isLoading || isCompleted}
					>
						{isLoading ? (
							<Loader className="animate-spin h-4 w-4 mr-2" />
						) : (
							<Plus className="h-4 w-4 mr-2" />
						)}
						{isCompleted
							? "Đã hoàn tất"
							: isLoading
							? "Đang tạo..."
							: "Tiếp tục tạo nội dung"}
					</Button>
				</div>
			</div>
		);
	};

	const renderLearnSettings = () => {
		if (scope !== "all" || !allProps) return null;
        
        const handleSaveSettings = () => {
            allProps.onSettingsChange({
                topic: allProps.topic,
                language: allProps.language,
                model: allProps.model,
            });
            toast({
                title: "Đã lưu cài đặt",
                description: "Cài đặt học tập của bạn đã được cập nhật.",
            })
        }

		return (
			<div className="space-y-4">
				<div className="space-y-2">
					<Label className="font-medium text-foreground flex items-center gap-2">
						<KeyRound className="w-4 h-4" />
						<span>Quản lý Gemini API Keys</span>
					</Label>
					{renderApiKeyManagement()}
				</div>
				<Separator />
				{renderContentGenerationControls()}
			</div>
		)
	}

	const renderGlobalSettings = () => {
		if (scope !== "all") return null
		const allProps = props as AllSettingsProps
		return (
			<div className="space-y-4">
				<div className="space-y-4">
					<Label className="font-medium text-foreground">
						Hình nền
					</Label>
					<div className="flex items-center gap-2">
						<Button
							variant="outline"
							className="w-full"
							onClick={() => fileInputRef.current?.click()}
						>
							<Upload className="mr-2 h-4 w-4" />
							Tải ảnh lên (tối đa 10MB)
						</Button>
						<Button
							variant="ghost"
							size="icon"
							onClick={() => allProps.onBackgroundChange(null)}
							aria-label="Xóa hình nền"
						>
							<Trash2 className="h-4 w-4" />
						</Button>
					</div>
					<input
						type="file"
						ref={fileInputRef}
						onChange={handleBackgroundUpload}
						className="hidden"
						accept="image/*"
					/>
					<div className="grid grid-cols-3 gap-2">
						{allProps.uploadedBackgrounds.map((bg, index) => (
							<div
								key={`uploaded-${index}`}
								className="relative cursor-pointer group"
								onClick={() => allProps.onBackgroundChange(bg)}
							>
								<Image
									src={bg}
									alt={`Uploaded background ${index + 1}`}
									width={100}
									height={60}
									className={cn(
										"rounded-md object-cover aspect-video",
										allProps.currentBackgroundImage ===
											bg &&
											"ring-2 ring-primary ring-offset-2 ring-offset-background"
									)}
								/>
								{allProps.currentBackgroundImage === bg && (
									<CheckCircle className="absolute top-1 right-1 h-5 w-5 text-primary bg-background rounded-full" />
								)}
							</div>
						))}
					</div>
				</div>
				<Separator />
				<div className="space-y-2">
					<Label className="font-medium text-foreground">
						Thành phần hiển thị
					</Label>
					<div className="space-y-3">
						<div className="flex items-center justify-between">
							<Label
								htmlFor="advanced-voice-chat-visible"
								className="flex items-center gap-2"
							>
								<Mic className="w-4 h-4" />
								<span>Chat thoại</span>
							</Label>
							<Switch
								id="advanced-voice-chat-visible"
								checked={allProps.visibility.advancedVoiceChat}
								onCheckedChange={(checked) =>
									allProps.onVisibilityChange({
										...allProps.visibility,
										advancedVoiceChat: checked,
									})
								}
							/>
						</div>
						<div className="flex items-center justify-between">
							<Label htmlFor="clock-visible">Đồng hồ</Label>
							<Switch
								id="clock-visible"
								checked={allProps.visibility.clock}
								onCheckedChange={(checked) =>
									allProps.onVisibilityChange({
										...allProps.visibility,
										clock: checked,
									})
								}
							/>
						</div>
						<div className="flex items-center justify-between">
							<Label htmlFor="greeting-visible">Lời chào</Label>
							<Switch
								id="greeting-visible"
								checked={allProps.visibility.greeting}
								onCheckedChange={(checked) =>
									allProps.onVisibilityChange({
										...allProps.visibility,
										greeting: checked,
									})
								}
							/>
						</div>
						<div className="flex items-center justify-between">
							<Label htmlFor="search-visible">Tìm kiếm</Label>
							<Switch
								id="search-visible"
								checked={allProps.visibility.search}
								onCheckedChange={(checked) =>
									allProps.onVisibilityChange({
										...allProps.visibility,
										search: checked,
									})
								}
							/>
						</div>
						<div className="flex items-center justify-between">
							<Label htmlFor="quicklinks-visible">
								Liên kết nhanh
							</Label>
							<Switch
								id="quicklinks-visible"
								checked={allProps.visibility.quickLinks}
								onCheckedChange={(checked) =>
									allProps.onVisibilityChange({
										...allProps.visibility,
										quickLinks: checked,
									})
								}
							/>
						</div>
					</div>
				</div>
			</div>
		)
	}

	if (isOnboardingScope) {
		return renderApiKeyManagement()
	}

	// The button is now rendered via the toolbar item, so we don't need to render anything here for the "all" scope.
	return null
}
