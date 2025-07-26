
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion"


type ViewType = "flashcards" | "quiz" | "theory";

type SettingsScope = "global" | "learn" | "learn-onboarding" | "learn-onboarding-generate";

interface CommonSettingsProps {
	scope: SettingsScope;
}

interface GlobalSettingsProps {
	scope: "global";
	onClearAllData: () => void
	onVisibilityChange: (visibility: ComponentVisibility) => void
	onBackgroundChange: (background: string | null) => void
	onUploadedBackgroundsChange: (backgrounds: string[]) => void
	visibility: ComponentVisibility
	uploadedBackgrounds: string[]
	currentBackgroundImage: string | null;
}

interface LearnSettingsProps {
	scope: "learn";
	onSettingsChange?: (settings: {
		topic: string
		language: string
		model: string
		flashcardMax: number
		quizMax: number
	}) => void
	onGenerateType?: (type: ViewType) => void;
	onClearLearningData?: () => void;
	onApiKeysChange: (apiKeys: string[]) => void;
	onSettingsChanged?: () => void; // For onboarding
	currentView?: ViewType
	topic?: string
	language?: string
	model?: string
	flashcardMax?: number
	quizMax?: number
	theoryCount?: number;
	theoryMax?: number;
	flashcardCount?: number;
	quizCount?: number;
	isTheoryLoading?: boolean;
	isFlashcardLoading?: boolean;
	isQuizLoading?: boolean;
	apiKeys: string[];
}

// A more limited version of LearnSettingsProps for onboarding
interface LearnOnboardingSettingsProps {
	scope: "learn-onboarding" | "learn-onboarding-generate";
	onApiKeysChange: (apiKeys: string[]) => void;
	onSettingsChanged: () => void; // For onboarding
	apiKeys: string[];
	onGenerateType?: (type: ViewType) => void;
	flashcardMax?: number
	quizMax?: number
	theoryCount?: number;
	theoryMax?: number;
	flashcardCount?: number;
	quizCount?: number;
	isTheoryLoading?: boolean;
	isFlashcardLoading?: boolean;
	isQuizLoading?: boolean;
}


type SettingsProps = CommonSettingsProps & (GlobalSettingsProps | LearnSettingsProps | LearnOnboardingSettingsProps);

export const languages = [
	{ value: "Vietnamese", label: "Tiếng Việt" },
	{ value: "English", label: "English" },
	{ value: "Spanish", label: "Español" },
	{ value: "French", label: "Français" },
	{ value: "German", label: "Deutsch" },
	{ value: "Japanese", label: "日本語" },
	{ value: "Korean", label: "한국어" },
]

const models = [
    { value: "gemini-1.5-flash-latest", label: "Gemini 1.5 Flash (Nhanh, mặc định)" },
    { value: "gemini-1.5-pro-latest", label: "Gemini 1.5 Pro (Mạnh mẽ hơn)" },
]

const MAX_UPLOADED_IMAGES = 6

export function Settings(props: SettingsProps) {
	const { scope } = props;
	const isLearnScope = scope === "learn";
	const isOnboardingScope = scope.startsWith("learn-onboarding");
	const { toast } = useToast();
	const [isSheetOpen, setIsSheetOpen] = useState(false);


	// Local state for learn settings
	const [topic, setTopic] = useState(scope === "learn" ? (props as LearnSettingsProps).topic ?? "" : "")
	const [language, setLanguage] = useState(scope === "learn" ? (props as LearnSettingsProps).language ?? "Vietnamese" : "Vietnamese")
	const [model, setModel] = useState(scope === "learn" ? (props as LearnSettingsProps).model ?? "gemini-1.5-flash-latest" : "gemini-1.5-flash-latest")
	const [flashcardMax, setFlashcardMax] = useState(scope === "learn" ? (props as LearnSettingsProps).flashcardMax ?? 50 : 50)
	const [quizMax, setQuizMax] = useState(scope === "learn" ? (props as LearnSettingsProps).quizMax ?? 50 : 50)
	
	// Local state for API keys (now managed in learn settings)
	const [localApiKeys, setLocalApiKeys] = useState<string[]>(scope.startsWith("learn") ? (props as LearnSettingsProps | LearnOnboardingSettingsProps).apiKeys : [])
	const [newApiKey, setNewApiKey] = useState("");


	const fileInputRef = useRef<HTMLInputElement>(null)

	// Sync local state with props when the sheet opens or props change
	useEffect(() => {
		if (scope === "learn") {
			const learnProps = props as LearnSettingsProps;
			if(isSheetOpen) {
				setTopic(learnProps.topic ?? "")
				setLanguage(learnProps.language ?? "Vietnamese")
				setModel(learnProps.model ?? "gemini-1.5-flash-latest")
				setFlashcardMax(learnProps.flashcardMax ?? 50)
				setQuizMax(learnProps.quizMax ?? 50)
				setLocalApiKeys(learnProps.apiKeys);
			}
		} else if (isOnboardingScope) {
			const learnProps = props as LearnOnboardingSettingsProps;
			setLocalApiKeys(learnProps.apiKeys);
		}
	}, [props, scope, isSheetOpen, isOnboardingScope])

	const handleLocalSettingsSave = () => {
		if (scope === "learn" && (props as LearnSettingsProps).onSettingsChange) {
			const learnProps = props as LearnSettingsProps;
			learnProps.onSettingsChange!({
				topic,
				language,
				model,
				flashcardMax,
				quizMax,
			});
			if (learnProps.onSettingsChanged) {
				learnProps.onSettingsChanged();
			}
			toast({
				title: "Đã lưu cài đặt",
				description: "Các thay đổi của bạn đã được lưu lại.",
			});
		}
	}

	const handleAddNewApiKey = () => {
		if (!scope.startsWith("learn")) return;
		if (newApiKey.trim()) {
			if (!localApiKeys.includes(newApiKey.trim())) {
				const newKeys = [...localApiKeys, newApiKey.trim()];
				setLocalApiKeys(newKeys);
				(props as LearnSettingsProps | LearnOnboardingSettingsProps).onApiKeysChange(newKeys);
			}
			setNewApiKey("");
		}
    };

    const handleRemoveApiKey = (keyToRemove: string) => {
		if (!scope.startsWith("learn")) return;
        const newKeys = localApiKeys.filter(key => key !== keyToRemove);
		setLocalApiKeys(newKeys);
		(props as LearnSettingsProps | LearnOnboardingSettingsProps).onApiKeysChange(newKeys);
    };

	const handleGenerateType = (type: ViewType) => {
		if (scope === "learn" || scope === "learn-onboarding-generate") {
			const learnProps = props as LearnSettingsProps | LearnOnboardingSettingsProps;
			if (learnProps.onGenerateType) {
				learnProps.onGenerateType(type);
			}
		}
	};
	
	const handleClearData = () => {
		if (scope === "global") {
			const globalProps = props as GlobalSettingsProps;
			globalProps.onClearAllData()
			setIsSheetOpen(false);
		}
	}

	const handleClearLearningData = () => {
		if (scope === "learn") {
			const learnProps = props as LearnSettingsProps;
			if (learnProps.onClearLearningData) {
				learnProps.onClearLearningData();
				setIsSheetOpen(false);
			}
		}
	};

	const handleBackgroundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (scope === "global") {
			const globalProps = props as GlobalSettingsProps;
			const file = e.target.files?.[0]
			if (file) {
				const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
				if (file.size > MAX_FILE_SIZE) {
					toast({
						title: "Lỗi tải lên",
						description: "File quá lớn! Vui lòng chọn ảnh nhỏ hơn 10MB.",
						variant: "destructive"
					})
					return
				}
				const reader = new FileReader()
				reader.onload = (event) => {
					const result = event.target?.result as string
					const newUploadedBgs = [result, ...globalProps.uploadedBackgrounds].slice(
						0,
						MAX_UPLOADED_IMAGES
					)
					globalProps.onUploadedBackgroundsChange(newUploadedBgs)
					globalProps.onBackgroundChange(result)
				}
				reader.readAsDataURL(file)
			}
		}
	}

	const numericInputProps = {
		onWheel: (e: React.WheelEvent<HTMLInputElement>) =>
			(e.target as HTMLElement).blur(),
		onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) =>
			["e", "E", "+", "-"].includes(e.key) && e.preventDefault(),
	}

	const renderApiKeyManagement = () => {
		if (!scope.startsWith("learn")) return null;
		const learnProps = props as LearnOnboardingSettingsProps; // Base props for onboarding

		return (
			<div className="space-y-2">
				<div className="flex gap-2 pt-2">
					<Input
						id="newApiKey"
						value={newApiKey}
						onChange={(e) => setNewApiKey(e.target.value)}
						placeholder="Dán API key mới vào đây"
						onKeyDown={(e) => {
							if (e.key === 'Enter') {
								e.preventDefault();
								handleAddNewApiKey();
							}
						}}
					/>
					<Button onClick={handleAddNewApiKey} variant="outline" size="icon">
						<Plus className="w-4 h-4" />
					</Button>
				</div>

				<div className="space-y-2 mt-2 rounded-md border max-h-48 overflow-y-auto p-2">
					{localApiKeys.length > 0 ? (
						localApiKeys.map((key, index) => (
							<div key={index} className="flex items-center justify-between gap-2 bg-secondary p-2 rounded-md">
								<span className="truncate text-sm text-secondary-foreground font-mono">
									...{key.slice(-8)}
								</span>
								<Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleRemoveApiKey(key)}>
									<X className="w-4 h-4" />
								</Button>
							</div>
						))
					) : (
						<p className="text-xs text-muted-foreground text-center p-2">Chưa có API key nào.</p>
					)}
				</div>
				
				{scope === "learn-onboarding" && (
					<Button onClick={learnProps.onSettingsChanged} disabled={localApiKeys.length === 0} className="w-full mt-4">
						Tiếp tục
					</Button>
				)}
			</div>
		)
	}

	const renderContentGenerationControls = () => {
		if (scope !== 'learn' && scope !== 'learn-onboarding-generate') return null;
		const learnProps = props as LearnSettingsProps | LearnOnboardingSettingsProps;
		
		const fMax = 'flashcardMax' in learnProps ? learnProps.flashcardMax ?? 50 : 50;
		const qMax = 'quizMax' in learnProps ? learnProps.quizMax ?? 50 : 50;

		return (
			<div className="space-y-4">
				{scope === "learn" && <Label className="font-medium text-foreground">Quản lý nội dung học tập</Label>}
				
				{/* Theory Progress */}
				<div className="space-y-2">
					<div className="flex justify-between items-center text-sm">
						<Label htmlFor="theory-progress">Lý thuyết</Label>
						<span className="text-muted-foreground">{learnProps.theoryCount} / {learnProps.theoryMax! > 0 ? learnProps.theoryMax : '?'}</span>
					</div>
					<div className="flex items-center gap-2">
						<Progress value={learnProps.theoryMax! > 0 ? (learnProps.theoryCount! / learnProps.theoryMax!) * 100 : 0} id="theory-progress" />
						<Button size="icon" variant="outline" onClick={() => handleGenerateType('theory')} disabled={learnProps.isTheoryLoading}>
							{learnProps.isTheoryLoading ? <Loader className="animate-spin" /> : <Plus />}
						</Button>
					</div>
				</div>

				{/* Flashcard Progress */}
				<div className="space-y-2">
					<div className="flex justify-between items-center text-sm">
						<Label htmlFor="flashcard-progress">Flashcards</Label>
						<span className="text-muted-foreground">{learnProps.flashcardCount} / {fMax}</span>
					</div>
					<div className="flex items-center gap-2">
						<Progress value={(learnProps.flashcardCount! / fMax) * 100} id="flashcard-progress" />
						<Button size="icon" variant="outline" onClick={() => handleGenerateType('flashcards')} disabled={learnProps.flashcardCount! >= fMax || learnProps.isFlashcardLoading}>
							{learnProps.isFlashcardLoading ? <Loader className="animate-spin" /> : <Plus />}
						</Button>
					</div>
					{scope === "learn" && <Input
						id="flashcardMax"
						type="number"
						value={flashcardMax}
						onChange={(e) => setFlashcardMax(parseInt(e.target.value) || 0)}
						className="mt-2"
						placeholder="Số lượng tối đa, ví dụ: 50"
						{...numericInputProps}
					/>}
				</div>

				{/* Quiz Progress */}
				<div className="space-y-2">
					<div className="flex justify-between items-center text-sm">
						<Label htmlFor="quiz-progress">Trắc nghiệm</Label>
						<span className="text-muted-foreground">{learnProps.quizCount} / {qMax}</span>
					</div>
					<div className="flex items-center gap-2">
						<Progress value={(learnProps.quizCount! / qMax) * 100} id="quiz-progress" />
						<Button size="icon" variant="outline" onClick={() => handleGenerateType('quiz')} disabled={learnProps.quizCount! >= qMax || learnProps.isQuizLoading}>
							{learnProps.isQuizLoading ? <Loader className="animate-spin" /> : <Plus />}
						</Button>
					</div>
					{scope === "learn" && <Input
						id="quizMax"
						type="number"
						value={quizMax}
						onChange={(e) => setQuizMax(parseInt(e.target.value) || 0)}
						className="mt-2"
						placeholder="Số lượng tối đa, ví dụ: 50"
						{...numericInputProps}
					/>}
				</div>
			</div>
		)
	}

	const renderLearnSettings = () => {
		if (scope !== "learn") return null;

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

				<div className="space-y-2">
					<Label htmlFor="model">Model</Label>
					<Select value={model} onValueChange={setModel}>
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
				{renderContentGenerationControls()}
			</div>
		)
	}


	const renderGlobalSettings = () => {
		if (scope !== "global") return null;
		const globalProps = props as GlobalSettingsProps;
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
								onClick={() => globalProps.onBackgroundChange(bg)}
							>
								<Image
									src={bg}
									alt={`Uploaded background ${index + 1}`}
									width={100}
									height={60}
									className={cn(
										"rounded-md object-cover aspect-video",
										globalProps.currentBackgroundImage === bg &&
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
							<Label htmlFor="greeting-visible">
								Lời chào
							</Label>
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
							<Label htmlFor="learn-visible">
								Phần học tập
							</Label>
						</div>
					</div>
				</div>
			</div>
		)
	}
	

	if (isOnboardingScope) {
		if(scope === 'learn-onboarding') {
			return renderApiKeyManagement();
		}
		if(scope === 'learn-onboarding-generate') {
			return renderContentGenerationControls();
		}
	}

	return (
		<Sheet
			open={isSheetOpen}
			onOpenChange={setIsSheetOpen}
		>
			<SheetTrigger asChild>
				<Button 
					variant={isLearnScope ? "outline" : "ghost"} 
					size="icon" 
					className={cn(isLearnScope && "h-9 w-9")}>
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
							<span>{isLearnScope ? "Cài đặt học tập" : "Cài đặt chung"}</span>
						</div>
					</SheetTitle>
				</SheetHeader>

				<div className="flex-grow overflow-y-auto pr-6 pl-1 -mr-6">
					<div className="grid gap-6 py-4">
						<Separator />
						{isLearnScope ? renderLearnSettings() : renderGlobalSettings()}
					</div>
				</div>

				<SheetFooter className="mt-auto pt-4 border-t">
					{isLearnScope ? (
						<div className="w-full flex justify-between">
							<AlertDialog>
								<AlertDialogTrigger asChild>
									<Button variant="destructive">
										<Trash2 className="mr-2 h-4 w-4" />
										Xóa dữ liệu
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
											Hành động này sẽ xóa vĩnh viễn tất cả flashcard, bài trắc nghiệm và lý thuyết của chủ đề hiện tại. Hành động này không thể hoàn tác.
										</AlertDialogDescription>
									</AlertDialogHeader>
									<AlertDialogFooter>
										<AlertDialogCancel>Hủy</AlertDialogCancel>
										<AlertDialogAction onClick={handleClearLearningData}>
											Vâng, xóa dữ liệu
										</AlertDialogAction>
									</AlertDialogFooter>
								</AlertDialogContent>
							</AlertDialog>
							<Button onClick={handleLocalSettingsSave}>
								<Save className="mr-2 h-4 w-4" />
								Lưu thay đổi
							</Button>
						</div>
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
										flashcard, bài trắc nghiệm, lịch sử và cài
										đặt của bạn. Hành động này không thể hoàn
										tác.
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

    
