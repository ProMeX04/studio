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
import type { ComponentVisibility } from "@/app/page"
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

type ViewType = "flashcards" | "quiz" | "theory"

type SettingsScope =
	| "global"
	| "learn"
	| "learn-onboarding"
	| "learn-onboarding-generate"

interface CommonSettingsProps {
	scope: SettingsScope
}

interface GlobalSettingsProps {
	scope: "global"
	onClearAllData: () => void
	onVisibilityChange: (visibility: ComponentVisibility) => void
	onBackgroundChange: (background: string | null) => void
	onUploadedBackgroundsChange: (backgrounds: string[]) => void
	visibility: ComponentVisibility
	uploadedBackgrounds: string[]
	currentBackgroundImage: string | null
}

interface LearnSettingsProps {
	scope: "learn"
	onSettingsChange?: (settings: {
		topic: string
		language: string
		flashcardMax: number
		quizMax: number
	}) => void
	onModelChange: (model: string) => void
	onGenerateType?: (type: ViewType) => void
	onClearLearningData?: () => void
	onApiKeysChange: (apiKeys: string[]) => void
	onResetOnboarding: () => void
	onSettingsChanged?: () => void // For onboarding
	currentView?: ViewType
	topic?: string
	language?: string
	model?: string
	flashcardMax?: number
	quizMax?: number
	theoryCount?: number
	theoryMax?: number
	flashcardCount?: number
	quizCount?: number
	isTheoryLoading?: boolean
	isFlashcardLoading?: boolean
	isQuizLoading?: boolean
	apiKeys: string[]
}

// A more limited version of LearnSettingsProps for onboarding
interface LearnOnboardingSettingsProps {
	scope: "learn-onboarding" | "learn-onboarding-generate"
	onApiKeysChange: (apiKeys: string[]) => void
	onSettingsChanged: () => void // For onboarding
	apiKeys: string[]
	onGenerateType?: (type: ViewType) => void
	flashcardMax?: number
	quizMax?: number
	theoryCount?: number
	theoryMax?: number
	flashcardCount?: number
	quizCount?: number
	isTheoryLoading?: boolean
	isFlashcardLoading?: boolean
	isQuizLoading?: boolean
}

type SettingsProps = CommonSettingsProps &
	(GlobalSettingsProps | LearnSettingsProps | LearnOnboardingSettingsProps)

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
		label: "Gemini 2.5 Flash Lite (Rất Nhanh, Chính xác tương đối)",
	},
	{
		value: "gemini-2.5-flash",
		label: "Gemini 2.5 Flash (Trung bình, ổn định)",
	},
	{ value: "gemini-2.5-pro", label: "Gemini 2.5 Pro (Chính xác, Giới hạn)" },
]

const MAX_UPLOADED_IMAGES = 6

export function Settings(props: SettingsProps) {
	const { scope } = props
	const isLearnScope = scope === "learn"
	const isOnboardingScope = scope.startsWith("learn-onboarding")
	const { toast } = useToast()
	const [isSheetOpen, setIsSheetOpen] = useState(false)
	const [isConfirmingTopicChange, setIsConfirmingTopicChange] =
		useState(false)

	// Local state for learn settings
	const [topic, setTopic] = useState(
		scope === "learn" ? (props as LearnSettingsProps).topic ?? "" : ""
	)
	const [language, setLanguage] = useState(
		scope === "learn"
			? (props as LearnSettingsProps).language ?? "Vietnamese"
			: "Vietnamese"
	)
	const [model, setModel] = useState(
		scope === "learn"
			? (props as LearnSettingsProps).model ?? "gemini-2.5-flash-lite"
			: "gemini-2.5-flash-lite"
	)
	const [flashcardMax, setFlashcardMax] = useState(
		scope === "learn"
			? (props as LearnSettingsProps).flashcardMax ?? 50
			: 50
	)
	const [quizMax, setQuizMax] = useState(
		scope === "learn" ? (props as LearnSettingsProps).quizMax ?? 50 : 50
	)

	// Local state for API keys (now managed in learn settings)
	const [localApiKeys, setLocalApiKeys] = useState<string[]>(
		scope.startsWith("learn")
			? (props as LearnSettingsProps | LearnOnboardingSettingsProps)
					.apiKeys
			: []
	)
	const [newApiKey, setNewApiKey] = useState("")

	const fileInputRef = useRef<HTMLInputElement>(null)

	const learnProps =
		scope === "learn" ? (props as LearnSettingsProps) : undefined
	const topicChanged = learnProps && learnProps.topic !== topic

	const settingsChanged =
		learnProps &&
		(topicChanged ||
			learnProps.language !== language ||
			learnProps.flashcardMax !== flashcardMax ||
			learnProps.quizMax !== quizMax)

	// Sync local state with props when the sheet opens or props change
	useEffect(() => {
		if (scope === "learn") {
			const learnProps = props as LearnSettingsProps
			if (isSheetOpen) {
				setTopic(learnProps.topic ?? "")
				setLanguage(learnProps.language ?? "Vietnamese")
				setModel(learnProps.model ?? "gemini-2.5-flash-lite")
				setFlashcardMax(learnProps.flashcardMax ?? 50)
				setQuizMax(learnProps.quizMax ?? 50)
				setLocalApiKeys(learnProps.apiKeys)
				setIsConfirmingTopicChange(false) // Reset confirmation on open
			}
		} else if (isOnboardingScope) {
			const learnProps = props as LearnOnboardingSettingsProps
			setLocalApiKeys(learnProps.apiKeys)
		}
	}, [props, scope, isSheetOpen, isOnboardingScope])

	const handleSave = () => {
		if (scope !== "learn" || !learnProps?.onSettingsChange) return

		// If topic changed and we are not yet confirming, start confirmation process
		if (topicChanged && !isConfirmingTopicChange) {
			setIsConfirmingTopicChange(true)
			return
		}

		// Proceed with saving
		learnProps.onSettingsChange({
			topic,
			language,
			flashcardMax,
			quizMax,
		})

		if (learnProps.onSettingsChanged) {
			learnProps.onSettingsChanged()
		}

		toast({
			title: "Đã lưu cài đặt",
			description: "Các thay đổi của bạn đã được lưu lại.",
		})
		setIsConfirmingTopicChange(false) // Reset confirmation state after saving
		setIsSheetOpen(false) // Close sheet after saving
	}

	const handleCancelTopicChange = () => {
		setIsConfirmingTopicChange(false)
	}

	const handleAddNewApiKey = () => {
		if (!scope.startsWith("learn")) return
		if (newApiKey.trim()) {
			if (!localApiKeys.includes(newApiKey.trim())) {
				const newKeys = [...localApiKeys, newApiKey.trim()]
				setLocalApiKeys(newKeys)
				;(
					props as LearnSettingsProps | LearnOnboardingSettingsProps
				).onApiKeysChange(newKeys)
			}
			setNewApiKey("")
		}
	}

	const handleRemoveApiKey = (keyToRemove: string) => {
		if (!scope.startsWith("learn")) return
		const newKeys = localApiKeys.filter((key) => key !== keyToRemove)
		setLocalApiKeys(newKeys)
		;(
			props as LearnSettingsProps | LearnOnboardingSettingsProps
		).onApiKeysChange(newKeys)
	}

	const handleGenerateType = (type: ViewType) => {
		if (scope === "learn" || scope === "learn-onboarding-generate") {
			const learnProps = props as
				| LearnSettingsProps
				| LearnOnboardingSettingsProps
			if (learnProps.onGenerateType) {
				learnProps.onGenerateType(type)
			}
		}
	}

	const handleClearData = () => {
		if (scope === "global") {
			const globalProps = props as GlobalSettingsProps
			globalProps.onClearAllData()
			setIsSheetOpen(false)
		}
	}

	const handleClearLearningData = () => {
		if (scope === "learn") {
			const learnProps = props as LearnSettingsProps
			if (learnProps.onClearLearningData) {
				learnProps.onClearLearningData()
				setIsSheetOpen(false)
			}
		}
	}

	const handleResetOnboarding = () => {
		if (scope === "learn") {
			const learnProps = props as LearnSettingsProps
			learnProps.onResetOnboarding()
		}
	}

	const handleBackgroundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (scope === "global") {
			const globalProps = props as GlobalSettingsProps
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
						...globalProps.uploadedBackgrounds,
					].slice(0, MAX_UPLOADED_IMAGES)
					globalProps.onUploadedBackgroundsChange(newUploadedBgs)
					globalProps.onBackgroundChange(result)
				}
				reader.readAsDataURL(file)
			}
		}
	}

	const handleModelChange = (newModel: string) => {
		if (scope === "learn" && learnProps) {
			setModel(newModel)
			learnProps.onModelChange(newModel)
		}
	}

	const handleIncrement = (type: "flashcard" | "quiz") => {
		if (scope !== "learn" || !learnProps) return
		const STEP = 5
		const MAX = 200

		if (type === "flashcard") {
			const newValue = Math.min(flashcardMax + STEP, MAX)
			setFlashcardMax(newValue)
		} else {
			const newValue = Math.min(quizMax + STEP, MAX)
			setQuizMax(newValue)
		}
	}

	const handleDecrement = (type: "flashcard" | "quiz") => {
		if (scope !== "learn" || !learnProps) return
		const STEP = 5

		if (type === "flashcard") {
			const min = learnProps.flashcardCount ?? 0
			const newValue = Math.max(flashcardMax - STEP, min, 0)
			setFlashcardMax(newValue)
		} else {
			const min = learnProps.quizCount ?? 0
			const newValue = Math.max(quizMax - STEP, min, 0)
			setQuizMax(newValue)
		}
	}

	const renderApiKeyManagement = () => {
		if (!scope.startsWith("learn")) return null
		const learnProps = props as LearnOnboardingSettingsProps // Base props for onboarding

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
						onClick={learnProps.onSettingsChanged}
						disabled={localApiKeys.length === 0}
						className="w-full mt-4"
					>
						Tiếp tục
					</Button>
				)}
			</div>
		)
	}

	const renderContentGenerationControls = () => {
		if (scope !== "learn" && scope !== "learn-onboarding-generate")
			return null
		const learnProps = props as
			| LearnSettingsProps
			| LearnOnboardingSettingsProps

		const fMax =
			scope === "learn" ? flashcardMax : learnProps.flashcardMax ?? 50
		const qMax = scope === "learn" ? quizMax : learnProps.quizMax ?? 50

		return (
			<div className="space-y-4">
				{scope === "learn" && (
					<Label className="font-medium text-foreground">
						Quản lý nội dung học tập
					</Label>
				)}

				{/* Theory Progress */}
				<div className="space-y-2">
					<div className="flex justify-between items-center text-sm">
						<Label htmlFor="theory-progress">Lý thuyết</Label>
						<span className="text-muted-foreground">
							{learnProps.theoryCount} /{" "}
							{learnProps.theoryMax! > 0
								? learnProps.theoryMax
								: "?"}
						</span>
					</div>
					<div className="flex items-center gap-2">
						<Progress
							value={
								learnProps.theoryMax! > 0
									? (learnProps.theoryCount! /
											learnProps.theoryMax!) *
									  100
									: 0
							}
							id="theory-progress"
						/>
						<Button
							size="icon"
							variant="outline"
							onClick={() => handleGenerateType("theory")}
							disabled={learnProps.isTheoryLoading}
						>
							{learnProps.isTheoryLoading ? (
								<Loader className="animate-spin h-4 w-4" />
							) : (
								<Plus className="h-4 w-4" />
							)}
						</Button>
					</div>
				</div>

				{/* Flashcard Progress */}
				<div className="space-y-2">
					<div className="flex justify-between items-center text-sm">
						<Label htmlFor="flashcard-progress">Flashcards</Label>
						{scope === "learn" ? (
							<div className="flex items-center gap-2">
								<Button
									size="icon"
									variant="outline"
									className="h-6 w-6"
									onClick={() => handleDecrement("flashcard")}
									disabled={
										flashcardMax <=
										(learnProps.flashcardCount ?? 0)
									}
								>
									<Minus className="h-4 w-4" />
								</Button>
								<span className="text-muted-foreground text-center w-12">
									{learnProps.flashcardCount} / {fMax}
								</span>
								<Button
									size="icon"
									variant="outline"
									className="h-6 w-6"
									onClick={() => handleIncrement("flashcard")}
								>
									<Plus className="h-4 w-4" />
								</Button>
							</div>
						) : (
							<span className="text-muted-foreground">
								{learnProps.flashcardCount} / {fMax}
							</span>
						)}
					</div>
					<div className="flex items-center gap-2">
						<Progress
							value={(learnProps.flashcardCount! / fMax) * 100}
							id="flashcard-progress"
						/>
						<Button
							size="icon"
							variant="outline"
							onClick={() => handleGenerateType("flashcards")}
							disabled={
								learnProps.flashcardCount! >= fMax ||
								learnProps.isFlashcardLoading
							}
						>
							{learnProps.isFlashcardLoading ? (
								<Loader className="animate-spin h-4 w-4" />
							) : (
								<Plus className="h-4 w-4" />
							)}
						</Button>
					</div>
				</div>

				{/* Quiz Progress */}
				<div className="space-y-2">
					<div className="flex justify-between items-center text-sm">
						<Label htmlFor="quiz-progress">Trắc nghiệm</Label>
						{scope === "learn" ? (
							<div className="flex items-center gap-2">
								<Button
									size="icon"
									variant="outline"
									className="h-6 w-6"
									onClick={() => handleDecrement("quiz")}
									disabled={
										quizMax <= (learnProps.quizCount ?? 0)
									}
								>
									<Minus className="h-4 w-4" />
								</Button>
								<span className="text-muted-foreground text-center w-12">
									{learnProps.quizCount} / {qMax}
								</span>
								<Button
									size="icon"
									variant="outline"
									className="h-6 w-6"
									onClick={() => handleIncrement("quiz")}
								>
									<Plus className="h-4 w-4" />
								</Button>
							</div>
						) : (
							<span className="text-muted-foreground">
								{learnProps.quizCount} / {qMax}
							</span>
						)}
					</div>
					<div className="flex items-center gap-2">
						<Progress
							value={(learnProps.quizCount! / qMax) * 100}
							id="quiz-progress"
						/>
						<Button
							size="icon"
							variant="outline"
							onClick={() => handleGenerateType("quiz")}
							disabled={
								learnProps.quizCount! >= qMax ||
								learnProps.isQuizLoading
							}
						>
							{learnProps.isQuizLoading ? (
								<Loader className="animate-spin h-4 w-4" />
							) : (
								<Plus className="h-4 w-4" />
							)}
						</Button>
					</div>
				</div>
			</div>
		)
	}

	const renderLearnSettings = () => {
		if (scope !== "learn" || !learnProps) return null

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
				<div className="space-y-2">
					<Label className="font-medium text-foreground flex items-center gap-2">
						<BrainCircuit className="w-4 h-4" />
						<span>Cài đặt AI</span>
					</Label>
					<Select value={model} onValueChange={handleModelChange}>
						<SelectTrigger>
							<SelectValue placeholder="Chọn một model AI" />
						</SelectTrigger>
						<SelectContent>
							{models.map((m) => (
								<SelectItem key={m.value} value={m.value}>
									{m.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				<Separator />
				<div className="space-y-2">
					<Label className="font-medium text-foreground flex items-center gap-2">
						<BookOpen className="w-4 h-4" />
						<span>Cài đặt nội dung</span>
					</Label>
				</div>
				<div className="space-y-2">
					<Label htmlFor="topic">Chủ đề</Label>
					<Input
						id="topic"
						value={topic}
						onChange={(e) => setTopic(e.target.value)}
						placeholder="ví dụ: Lịch sử La Mã"
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="language">Ngôn ngữ</Label>
					<Select value={language} onValueChange={setLanguage}>
						<SelectTrigger>
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
				</div>

				<Separator />
				{renderContentGenerationControls()}
			</div>
		)
	}

	const renderGlobalSettings = () => {
		if (scope !== "global") return null
		const globalProps = props as GlobalSettingsProps
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
							onClick={() => globalProps.onBackgroundChange(null)}
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
						{globalProps.uploadedBackgrounds.map((bg, index) => (
							<div
								key={`uploaded-${index}`}
								className="relative cursor-pointer group"
								onClick={() =>
									globalProps.onBackgroundChange(bg)
								}
							>
								<Image
									src={bg}
									alt={`Uploaded background ${index + 1}`}
									width={100}
									height={60}
									className={cn(
										"rounded-md object-cover aspect-video",
										globalProps.currentBackgroundImage ===
											bg &&
											"ring-2 ring-primary ring-offset-2 ring-offset-background"
									)}
								/>
								{globalProps.currentBackgroundImage === bg && (
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
					<div className="grid grid-cols-2 gap-x-4 gap-y-4 pl-10">
						<div className="flex items-center space-x-2">
							<Switch
								id="clock-visible"
								checked={globalProps.visibility.clock}
								onCheckedChange={(checked) =>
									globalProps.onVisibilityChange({
										...globalProps.visibility,
										clock: checked,
									})
								}
							/>
							<Label htmlFor="clock-visible">Đồng hồ</Label>
						</div>
						<div className="flex items-center space-x-2">
							<Switch
								id="greeting-visible"
								checked={globalProps.visibility.greeting}
								onCheckedChange={(checked) =>
									globalProps.onVisibilityChange({
										...globalProps.visibility,
										greeting: checked,
									})
								}
							/>
							<Label htmlFor="greeting-visible">Lời chào</Label>
						</div>
						<div className="flex items-center space-x-2">
							<Switch
								id="search-visible"
								checked={globalProps.visibility.search}
								onCheckedChange={(checked) =>
									globalProps.onVisibilityChange({
										...globalProps.visibility,
										search: checked,
									})
								}
							/>
							<Label htmlFor="search-visible">Tìm kiếm</Label>
						</div>
						<div className="flex items-center space-x-2">
							<Switch
								id="quicklinks-visible"
								checked={globalProps.visibility.quickLinks}
								onCheckedChange={(checked) =>
									globalProps.onVisibilityChange({
										...globalProps.visibility,
										quickLinks: checked,
									})
								}
							/>
							<Label htmlFor="quicklinks-visible">
								Liên kết nhanh
							</Label>
						</div>
						<div className="flex items-center space-x-2">
							<Switch
								id="learn-visible"
								checked={globalProps.visibility.learn}
								onCheckedChange={(checked) =>
									globalProps.onVisibilityChange({
										...globalProps.visibility,
										learn: checked,
									})
								}
							/>
							<Label htmlFor="learn-visible">Phần học tập</Label>
						</div>
					</div>
				</div>
			</div>
		)
	}

	if (isOnboardingScope) {
		if (scope === "learn-onboarding") {
			return renderApiKeyManagement()
		}
		if (scope === "learn-onboarding-generate") {
			return renderContentGenerationControls()
		}
	}

	return (
		<Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
			<SheetTrigger asChild>
				<Button
					variant={isLearnScope ? "outline" : "ghost"}
					size="icon"
					className={cn(isLearnScope && "h-9 w-9")}
				>
					{isLearnScope ? <Menu /> : <SettingsIcon />}
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
							{isLearnScope ? <BookOpen /> : <Brush />}
							<span>
								{isLearnScope
									? "Cài đặt học tập"
									: "Cài đặt chung"}
							</span>
						</div>
					</SheetTitle>
				</SheetHeader>

				<div className="flex-grow overflow-y-auto pr-6 pl-1 -mr-6">
					<div className="grid gap-6 py-4">
						<Separator />
						{isLearnScope
							? renderLearnSettings()
							: renderGlobalSettings()}
					</div>
				</div>

				<SheetFooter className="mt-auto pt-4 border-t">
					{isLearnScope ? (
						<>
							{isConfirmingTopicChange ? (
								<div className="space-y-2 rounded-lg border border-destructive p-4">
									<p className="text-sm text-destructive-foreground font-medium">
										Thay đổi chủ đề sẽ xóa tất cả dữ liệu
										học tập cũ.
									</p>
									<p className="text-sm text-muted-foreground">
										Bạn có chắc chắn muốn tiếp tục?
									</p>
									<div className="flex justify-end gap-2 pt-2">
										<Button
											variant="ghost"
											onClick={handleCancelTopicChange}
										>
											Hủy
										</Button>
										<Button
											variant="destructive"
											onClick={handleSave}
										>
											Xác nhận
										</Button>
									</div>
								</div>
							) : (
								<div className="w-full flex justify-between items-center">
									<div className="flex gap-2">
										<AlertDialog>
											<AlertDialogTrigger asChild>
												<Button
													variant="outline"
													size="sm"
												>
													<Trash2 className="mr-2 h-4 w-4" />
													Xóa DL
												</Button>
											</AlertDialogTrigger>
											<AlertDialogContent>
												<AlertDialogHeader>
													<AlertDialogTitle>
														<div className="flex items-center gap-2">
															<AlertTriangle className="text-destructive" />
															<span>
																Bạn có chắc chắn
																không?
															</span>
														</div>
													</AlertDialogTitle>
													<AlertDialogDescription>
														Hành động này sẽ xóa
														vĩnh viễn tất cả
														flashcard, bài trắc
														nghiệm và lý thuyết của
														chủ đề hiện tại. Hành
														động này không thể hoàn
														tác.
													</AlertDialogDescription>
												</AlertDialogHeader>
												<AlertDialogFooter>
													<AlertDialogCancel>
														Hủy
													</AlertDialogCancel>
													<AlertDialogAction
														onClick={
															handleClearLearningData
														}
													>
														Vâng, xóa dữ liệu
													</AlertDialogAction>
												</AlertDialogFooter>
											</AlertDialogContent>
										</AlertDialog>
										<AlertDialog>
											<AlertDialogTrigger asChild>
												<Button
													variant="outline"
													size="sm"
												>
													<RefreshCw className="mr-2 h-4 w-4" />
													H.dẫn
												</Button>
											</AlertDialogTrigger>
											<AlertDialogContent>
												<AlertDialogHeader>
													<AlertDialogTitle>
														<div className="flex items-center gap-2">
															<AlertTriangle className="text-destructive" />
															<span>
																Chạy lại hướng
																dẫn ban đầu?
															</span>
														</div>
													</AlertDialogTitle>
													<AlertDialogDescription>
														Hành động này sẽ xóa cờ
														đánh dấu bạn đã hoàn
														thành hướng dẫn và tải
														lại trang để bắt đầu
														lại. Dữ liệu học tập sẽ
														không bị ảnh hưởng.
													</AlertDialogDescription>
												</AlertDialogHeader>
												<AlertDialogFooter>
													<AlertDialogCancel>
														Hủy
													</AlertDialogCancel>
													<AlertDialogAction
														onClick={
															handleResetOnboarding
														}
													>
														Ok, chạy lại
													</AlertDialogAction>
												</AlertDialogFooter>
											</AlertDialogContent>
										</AlertDialog>
									</div>

									{settingsChanged && (
										<Button onClick={handleSave}>
											<Save className="mr-2 h-4 w-4" />
											Lưu thay đổi
										</Button>
									)}
								</div>
							)}
						</>
					) : (
						<AlertDialog>
							<AlertDialogTrigger asChild>
								<Button variant="destructive">
									<Trash2 className="mr-2 h-4 w-4" />
									Xóa toàn bộ dữ liệu
								</Button>
							</AlertDialogTrigger>
							<AlertDialogContent>
								<AlertDialogHeader>
									<AlertDialogTitle>
										<div className="flex items-center gap-2">
											<AlertTriangle className="text-destructive" />
											<span>Bạn có chắc chắn không?</span>
										</div>
									</AlertDialogTitle>
									<AlertDialogDescription>
										Hành động này sẽ xóa vĩnh viễn tất cả
										flashcard, bài trắc nghiệm, lịch sử và
										cài đặt của bạn. Hành động này không thể
										hoàn tác.
									</AlertDialogDescription>
								</AlertDialogHeader>
								<AlertDialogFooter>
									<AlertDialogCancel>Hủy</AlertDialogCancel>
									<AlertDialogAction
										onClick={handleClearData}
										className={cn(
											buttonVariants({
												variant: "destructive",
											})
										)}
									>
										Vâng, xóa tất cả
									</AlertDialogAction>
								</AlertDialogFooter>
							</AlertDialogContent>
						</AlertDialog>
					)}
				</SheetFooter>
			</SheetContent>
		</Sheet>
	)
}
