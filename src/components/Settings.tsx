
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

interface CommonSettingsProps {
	scope: "global" | "learn";
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
	onSettingsChange: (settings: {
		topic: string
		language: string
		model: string
		flashcardMax: number
		quizMax: number
	}) => void
	onGenerateType: (type: ViewType) => void;
	onClearLearningData: () => void;
	onApiKeysChange: (apiKeys: string[]) => void;
	currentView: ViewType
	topic: string
	language: string
	model: string
	flashcardMax: number
	quizMax: number
	theoryCount: number;
	theoryMax: number;
	flashcardCount: number;
	quizCount: number;
	isTheoryLoading: boolean;
	isFlashcardLoading: boolean;
	isQuizLoading: boolean;
	apiKeys: string[];
}

type SettingsProps = CommonSettingsProps & (GlobalSettingsProps | LearnSettingsProps);

const languages = [
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
	const { toast } = useToast();

	const [isOpen, setIsOpen] = useState(false)
	
	// Local state for learn settings
	const [topic, setTopic] = useState(isLearnScope ? (props as LearnSettingsProps).topic : "")
	const [language, setLanguage] = useState(isLearnScope ? (props as LearnSettingsProps).language : "Vietnamese")
	const [model, setModel] = useState(isLearnScope ? (props as LearnSettingsProps).model : "gemini-1.5-flash-latest")
	const [flashcardMax, setFlashcardMax] = useState(isLearnScope ? (props as LearnSettingsProps).flashcardMax : 50)
	const [quizMax, setQuizMax] = useState(isLearnScope ? (props as LearnSettingsProps).quizMax : 50)
	
	// Local state for API keys (now managed in learn settings)
	const [localApiKeys, setLocalApiKeys] = useState<string[]>(isLearnScope ? (props as LearnSettingsProps).apiKeys : [])
	const [newApiKey, setNewApiKey] = useState("");


	const fileInputRef = useRef<HTMLInputElement>(null)

	// Sync local state with props when the sheet opens or props change
	useEffect(() => {
		if (!isOpen) return;
		if (isLearnScope) {
			const learnProps = props as LearnSettingsProps;
			setTopic(learnProps.topic)
			setLanguage(learnProps.language)
			setModel(learnProps.model)
			setFlashcardMax(learnProps.flashcardMax)
			setQuizMax(learnProps.quizMax)
			setLocalApiKeys(learnProps.apiKeys);
		}
	}, [isOpen, props, isLearnScope])

	const handleLocalSettingsSave = () => {
		if (isLearnScope) {
			const learnProps = props as LearnSettingsProps;
			learnProps.onSettingsChange({
				topic,
				language,
				model,
				flashcardMax,
				quizMax,
			});
			toast({
				title: "Đã lưu cài đặt",
				description: "Các thay đổi của bạn đã được lưu lại.",
			});
		}
	}

	const handleAddNewApiKey = () => {
		if (!isLearnScope) return;
		if (newApiKey.trim()) {
			if (!localApiKeys.includes(newApiKey.trim())) {
				const newKeys = [...localApiKeys, newApiKey.trim()];
				setLocalApiKeys(newKeys);
				(props as LearnSettingsProps).onApiKeysChange(newKeys);
			}
			setNewApiKey("");
		}
    };

    const handleRemoveApiKey = (keyToRemove: string) => {
		if (!isLearnScope) return;
        const newKeys = localApiKeys.filter(key => key !== keyToRemove);
		setLocalApiKeys(newKeys);
		(props as LearnSettingsProps).onApiKeysChange(newKeys);
    };

	const handleGenerateType = (type: ViewType) => {
		if (isLearnScope) {
			const learnProps = props as LearnSettingsProps;
			// Note: We don't save here anymore, user should save manually
			learnProps.onGenerateType(type);
		}
	};
	
	const handleClearData = () => {
		if (!isLearnScope) {
			const globalProps = props as GlobalSettingsProps;
			globalProps.onClearAllData()
			setIsOpen(false)
		}
	}

	const handleClearLearningData = () => {
		if (isLearnScope) {
			(props as LearnSettingsProps).onClearLearningData();
			setIsOpen(false);
		}
	};

	const handleBackgroundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (!isLearnScope) {
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

	const renderLearnSettings = () => {
		if (!isLearnScope) return null;
		const learnProps = props as LearnSettingsProps;

		return (
			<div className="space-y-4">
				<div className="space-y-2">
					<Label className="font-medium text-foreground flex items-center gap-2">
						<KeyRound className="w-4 h-4" />
						<span>Quản lý Gemini API Keys</span>
					</Label>
					<Accordion type="single" collapsible className="w-full">
						<AccordionItem value="item-1">
							<AccordionTrigger>
								<span className="flex items-center gap-2 text-sm text-muted-foreground">
									<HelpCircle className="w-4 h-4" />
									Tại sao cần API Key và lấy ở đâu?
								</span>
							</AccordionTrigger>
							<AccordionContent>
								<div className="text-sm text-muted-foreground space-y-2">
									<p>
										Ứng dụng này sử dụng Google Gemini để tạo nội dung học tập. Bạn cần cung cấp API Key (miễn phí) của riêng bạn để sử dụng các tính năng AI.
									</p>
									<p>
										Mẹo: Để đảm bảo ứng dụng hoạt động ổn định và nhanh chóng, bạn nên có từ 3 API key trở lên. Google giới hạn số lần sử dụng trong một khoảng thời gian nhất định, việc có nhiều key sẽ giúp ứng dụng tự động luân chuyển và tránh bị gián đoạn.
									</p>
									<Button asChild variant="link" className="p-0 h-auto">
										<a
											href="https://aistudio.google.com/app/apikey"
											target="_blank"
											rel="noopener noreferrer"
											className="inline-flex items-center gap-1"
										>
											Nhận API Key miễn phí tại đây <ExternalLink className="w-3 h-3" />
										</a>
									</Button>
								</div>
							</AccordionContent>
						</AccordionItem>
					</Accordion>
					
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
	
				<div className="space-y-4">
					<Label className="font-medium text-foreground">Quản lý nội dung học tập</Label>
					
					{/* Theory Progress */}
					<div className="space-y-2">
						<div className="flex justify-between items-center text-sm">
							<Label htmlFor="theory-progress">Lý thuyết</Label>
							<span className="text-muted-foreground">{learnProps.theoryCount} / {learnProps.theoryMax > 0 ? learnProps.theoryMax : '?'}</span>
						</div>
						<div className="flex items-center gap-2">
							<Progress value={learnProps.theoryMax > 0 ? (learnProps.theoryCount / learnProps.theoryMax) * 100 : 0} id="theory-progress" />
							<Button size="icon" variant="outline" onClick={() => handleGenerateType('theory')} disabled={learnProps.isTheoryLoading}>
								{learnProps.isTheoryLoading ? <Loader className="animate-spin" /> : <Plus />}
							</Button>
						</div>
					</div>
	
					{/* Flashcard Progress */}
					<div className="space-y-2">
						<div className="flex justify-between items-center text-sm">
							<Label htmlFor="flashcard-progress">Flashcards</Label>
							<span className="text-muted-foreground">{learnProps.flashcardCount} / {flashcardMax}</span>
						</div>
						<div className="flex items-center gap-2">
							<Progress value={(learnProps.flashcardCount / flashcardMax) * 100} id="flashcard-progress" />
							<Button size="icon" variant="outline" onClick={() => handleGenerateType('flashcards')} disabled={learnProps.flashcardCount >= flashcardMax || learnProps.isFlashcardLoading}>
								{learnProps.isFlashcardLoading ? <Loader className="animate-spin" /> : <Plus />}
							</Button>
						</div>
						<Input
							id="flashcardMax"
							type="number"
							value={flashcardMax}
							onChange={(e) => setFlashcardMax(parseInt(e.target.value) || 0)}
							className="mt-2"
							placeholder="Số lượng tối đa, ví dụ: 50"
							{...numericInputProps}
						/>
					</div>
	
					{/* Quiz Progress */}
					<div className="space-y-2">
						<div className="flex justify-between items-center text-sm">
							<Label htmlFor="quiz-progress">Trắc nghiệm</Label>
							<span className="text-muted-foreground">{learnProps.quizCount} / {quizMax}</span>
						</div>
						<div className="flex items-center gap-2">
							<Progress value={(learnProps.quizCount / quizMax) * 100} id="quiz-progress" />
							<Button size="icon" variant="outline" onClick={() => handleGenerateType('quiz')} disabled={learnProps.quizCount >= quizMax || learnProps.isQuizLoading}>
								{learnProps.isQuizLoading ? <Loader className="animate-spin" /> : <Plus />}
							</Button>
						</div>
						<Input
							id="quizMax"
							type="number"
							value={quizMax}
							onChange={(e) => setQuizMax(parseInt(e.target.value) || 0)}
							className="mt-2"
							placeholder="Số lượng tối đa, ví dụ: 50"
							{...numericInputProps}
						/>
					</div>
				</div>
			</div>
		)
	}


	const renderGlobalSettings = () => {
		if (isLearnScope) return null;
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

	return (
		<Sheet
			open={isOpen}
			onOpenChange={setIsOpen}
		>
			<SheetTrigger asChild>
				<Button variant={isLearnScope ? "outline" : "ghost"} size="icon" className={cn(isLearnScope && "h-9 w-9")}>
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
