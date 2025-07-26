
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
	KeyRound
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
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
import { Textarea } from "./ui/textarea"

interface CommonSettingsProps {
	scope: "global" | "learn";
}

interface GlobalSettingsProps {
	scope: "global";
	onClearAllData: () => void
	onVisibilityChange: (visibility: ComponentVisibility) => void
	onBackgroundChange: (background: string | null) => void
	onUploadedBackgroundsChange: (backgrounds: string[]) => void
	onApiKeysChange: (apiKeys: string[]) => void;
	visibility: ComponentVisibility
	uploadedBackgrounds: string[]
	currentBackgroundImage: string | null;
	apiKeys: string[];
}

interface LearnSettingsProps {
	scope: "learn";
	onSettingsChange: (settings: {
		topic: string
		language: string
		flashcardMax: number
		quizMax: number
	}) => void
	onGenerateNew: (topic: string) => void
	currentView: "flashcards" | "quiz"
	topic: string
	language: string
	flashcardMax: number
	quizMax: number
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

const MAX_UPLOADED_IMAGES = 6

export function Settings(props: SettingsProps) {
	const { scope } = props;
	const isLearnScope = scope === "learn";

	const [isOpen, setIsOpen] = useState(false)
	
	// Local state for learn settings
	const [topic, setTopic] = useState(isLearnScope ? (props as LearnSettingsProps).topic : "")
	const [language, setLanguage] = useState(isLearnScope ? (props as LearnSettingsProps).language : "Vietnamese")
	const [flashcardMax, setFlashcardMax] = useState(isLearnScope ? (props as LearnSettingsProps).flashcardMax : 50)
	const [quizMax, setQuizMax] = useState(isLearnScope ? (props as LearnSettingsProps).quizMax : 50)
	
	// Local state for global settings
	const [apiKeys, setApiKeys] = useState(!isLearnScope ? (props as GlobalSettingsProps).apiKeys.join('\n') : "")


	const fileInputRef = useRef<HTMLInputElement>(null)

	// Sync local state with props when the sheet opens or props change
	useEffect(() => {
		if (!isOpen) return;
		if (isLearnScope) {
			const learnProps = props as LearnSettingsProps;
			setTopic(learnProps.topic)
			setLanguage(learnProps.language)
			setFlashcardMax(learnProps.flashcardMax)
			setQuizMax(learnProps.quizMax)
		} else {
			const globalProps = props as GlobalSettingsProps;
			setApiKeys(globalProps.apiKeys.join('\n'));
		}
	}, [isOpen, props, isLearnScope])

	const handleLocalSettingsSave = () => {
		if (isLearnScope) {
			const learnProps = props as LearnSettingsProps;
			learnProps.onSettingsChange({
				topic,
				language,
				flashcardMax,
				quizMax,
			})
		}
	}

	const handleApiKeysSave = () => {
		if (!isLearnScope) {
			const globalProps = props as GlobalSettingsProps;
			const keysArray = apiKeys.split('\n').map(k => k.trim()).filter(Boolean);
			globalProps.onApiKeysChange(keysArray);
		}
	};

	const handleGenerateNew = () => {
		if (isLearnScope) {
			const learnProps = props as LearnSettingsProps;
			handleLocalSettingsSave() // Save current settings first
			learnProps.onGenerateNew(topic)      // Then generate with the new topic
			setIsOpen(false)
		}
	}
	
	const handleClearData = () => {
		if (!isLearnScope) {
			const globalProps = props as GlobalSettingsProps;
			globalProps.onClearAllData()
			setIsOpen(false)
		}
	}

	const handleBackgroundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (!isLearnScope) {
			const globalProps = props as GlobalSettingsProps;
			const file = e.target.files?.[0]
			if (file) {
				const MAX_FILE_SIZE = 10 * 1024 * 1024
				if (file.size > MAX_FILE_SIZE) {
					alert("File quá lớn! Vui lòng chọn ảnh nhỏ hơn 10MB.")
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
		if (!isLearnScope) return null
		const learnProps = props as LearnSettingsProps
		const isFlashcardView = learnProps.currentView === "flashcards"
		const isQuizView = learnProps.currentView === "quiz"

		return (
			<div className="space-y-4">
				<div className="grid grid-cols-4 items-center gap-4">
					<Label htmlFor="topic" className="text-right">
						Chủ đề
					</Label>
					<Input
						id="topic"
						value={topic}
						onChange={(e) => setTopic(e.target.value)}
						className="col-span-3"
						placeholder="ví dụ: Lịch sử La Mã"
					/>
				</div>
				<div className="grid grid-cols-4 items-center gap-4">
					<Label htmlFor="language" className="text-right">
						Ngôn ngữ
					</Label>
					<Select value={language} onValueChange={setLanguage}>
						<SelectTrigger className="col-span-3">
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

				<div className="space-y-4">
					<div className="text-center font-semibold text-foreground">
						{isFlashcardView
							? "Cài đặt Flashcard"
							: "Cài đặt Trắc nghiệm"}
					</div>

					{isFlashcardView && (
						<div className="space-y-4 pt-2">
							<div className="grid grid-cols-4 items-center gap-4">
								<Label
									htmlFor="flashcardMax"
									className="text-right"
								>
									Số lượng tối đa
								</Label>
								<Input
									id="flashcardMax"
									type="number"
									value={flashcardMax}
									onChange={(e) =>
										setFlashcardMax(
											parseInt(e.target.value) || 0
										)
									}
									className="col-span-3"
									placeholder="ví dụ: 50"
									{...numericInputProps}
								/>
							</div>
						</div>
					)}

					{isQuizView && (
						<div className="space-y-4 pt-2">
							<div className="grid grid-cols-4 items-center gap-4">
								<Label htmlFor="quizMax" className="text-right">
									Số lượng tối đa
								</Label>
								<Input
									id="quizMax"
									type="number"
									value={quizMax}
									onChange={(e) =>
										setQuizMax(parseInt(e.target.value) || 0)
									}
									className="col-span-3"
									placeholder="ví dụ: 50"
									{...numericInputProps}
								/>
							</div>
						</div>
					)}
				</div>

				<div className="flex justify-center pt-2">
					<AlertDialog>
						<AlertDialogTrigger asChild>
							<Button variant="destructive">
								<RefreshCw className="mr-2 h-4 w-4" />
								Tạo lại & Xóa dữ liệu cũ
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
									Hành động này sẽ xóa vĩnh viễn tất cả flashcard hoặc bài trắc nghiệm của chủ đề <strong>{topic}</strong> và tạo lại từ đầu. Hành động này không thể hoàn tác.
								</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter>
								<AlertDialogCancel>Hủy</AlertDialogCancel>
								<AlertDialogAction onClick={handleGenerateNew}>
									Vâng, tạo lại
								</AlertDialogAction>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
				</div>
			</div>
		)
	}


	const renderGlobalSettings = () => {
		if (isLearnScope) return null;
		const globalProps = props as GlobalSettingsProps;
		return (
			<>
				<div className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="apiKeys" className="font-medium text-foreground flex items-center gap-2">
							<KeyRound className="w-4 h-4" />
							<span>Gemini API Keys</span>
						</Label>
						<div className="flex flex-col gap-2">
							<Textarea
								id="apiKeys"
								value={apiKeys}
								onChange={(e) => setApiKeys(e.target.value)}
								placeholder="Dán mỗi API key trên một dòng"
								rows={5}
							/>
							<Button onClick={handleApiKeysSave} className="self-end">Lưu Keys</Button>
						</div>
						<p className="text-xs text-muted-foreground pl-1">
							Các khóa API được lưu trữ an toàn trong trình duyệt và được sử dụng luân phiên.
						</p>
					</div>
				</div>
				<Separator />
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
			</>
		)
	}

	return (
		<Sheet
			open={isOpen}
			onOpenChange={(open) => {
				if (!open && isLearnScope) {
					// Save settings when closing the sheet only for learn scope
					handleLocalSettingsSave()
				}
				setIsOpen(open)
			}}
		>
			<SheetTrigger asChild>
				<Button variant={isLearnScope ? "outline" : "ghost"} size="icon" className={cn(isLearnScope && "h-9 w-9")}>
					<SettingsIcon />
					<span className="sr-only">Cài đặt</span>
				</Button>
			</SheetTrigger>
			<SheetContent
				side="right"
				className="max-h-[100vh] w-[400px] sm:max-w-[540px] overflow-y-auto"
			>
				<SheetHeader>
					<SheetTitle>
						<div className="flex items-center gap-2">
							{isLearnScope ? <BookOpen /> : <Brush />}
							<span>{isLearnScope ? "Cài đặt học tập" : "Cài đặt giao diện"}</span>
						</div>
					</SheetTitle>
				</SheetHeader>
				<div className="grid gap-6 py-4">
					<Separator />
					{isLearnScope ? renderLearnSettings() : renderGlobalSettings()}
				</div>

				{!isLearnScope && (
					<SheetFooter>
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
					</SheetFooter>
				)}
			</SheetContent>
		</Sheet>
	)
}
