
"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
	Settings as SettingsIcon,
	CheckCircle,
	Upload,
	Trash2,
	RefreshCw,
	AlertTriangle,
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

interface SettingsProps {
	onSettingsChange: (settings: {
		topic: string
		language: string
		flashcardMax: number
		quizMax: number
		flashcardIsRandom: boolean
	}) => void
	onClearAllData: () => void
	onGenerateNew: (topic: string) => void
	onVisibilityChange: (visibility: ComponentVisibility) => void
	onBackgroundChange: (background: string | null) => void
	onUploadedBackgroundsChange: (backgrounds: string[]) => void
	onViewChange: (view: "flashcards" | "quiz") => void

	currentView: "flashcards" | "quiz"
	visibility: ComponentVisibility
	uploadedBackgrounds: string[]
	currentBackgroundImage: string | null
	topic: string
	language: string
	flashcardMax: number
	quizMax: number
	flashcardIsRandom: boolean
}

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

export function Settings({
	onSettingsChange,
	onClearAllData,
	onGenerateNew,
	onVisibilityChange,
	onBackgroundChange,
	onUploadedBackgroundsChange,
	onViewChange,
	currentView,
	visibility,
	uploadedBackgrounds,
	currentBackgroundImage,
	topic: initialTopic,
	language: initialLanguage,
	flashcardMax: initialFlashcardMax,
	quizMax: initialQuizMax,
	flashcardIsRandom: initialFlashcardIsRandom,
}: SettingsProps) {
	const [isOpen, setIsOpen] = useState(false)
	// Local state for settings panel
	const [topic, setTopic] = useState(initialTopic)
	const [language, setLanguage] = useState(initialLanguage)
	const [flashcardMax, setFlashcardMax] = useState(initialFlashcardMax)
	const [quizMax, setQuizMax] = useState(initialQuizMax)
	const [flashcardIsRandom, setFlashcardIsRandom] =
		useState(initialFlashcardIsRandom)

	const fileInputRef = useRef<HTMLInputElement>(null)

	// Sync local state with props when the sheet opens or props change
	useEffect(() => {
		setTopic(initialTopic)
		setLanguage(initialLanguage)
		setFlashcardMax(initialFlashcardMax)
		setQuizMax(initialQuizMax)
		setFlashcardIsRandom(initialFlashcardIsRandom)
	}, [
		isOpen,
		initialTopic,
		initialLanguage,
		initialFlashcardMax,
		initialQuizMax,
		initialFlashcardIsRandom,
	])

	const handleLocalSettingsSave = () => {
		onSettingsChange({
			topic,
			language,
			flashcardMax,
			quizMax,
			flashcardIsRandom,
		})
	}

	const handleGenerateNew = () => {
		handleLocalSettingsSave() // Save current settings first
		onGenerateNew(topic)      // Then generate with the new topic
		setIsOpen(false)
	}
	
	const handleClearData = () => {
		onClearAllData()
		setIsOpen(false)
	}

	const handleBackgroundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0]
		if (file) {
			const MAX_FILE_SIZE = 2 * 1024 * 1024
			if (file.size > MAX_FILE_SIZE) {
				alert("File quá lớn! Vui lòng chọn ảnh nhỏ hơn 2MB.")
				return
			}
			const reader = new FileReader()
			reader.onload = (event) => {
				const result = event.target?.result as string
				const newUploadedBgs = [result, ...uploadedBackgrounds].slice(
					0,
					MAX_UPLOADED_IMAGES
				)
				onUploadedBackgroundsChange(newUploadedBgs)
				onBackgroundChange(result)
			}
			reader.readAsDataURL(file)
		}
	}

	const numericInputProps = {
		onWheel: (e: React.WheelEvent<HTMLInputElement>) =>
			(e.target as HTMLElement).blur(),
		onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) =>
			["e", "E", "+", "-"].includes(e.key) && e.preventDefault(),
	}

	return (
		<Sheet
			open={isOpen}
			onOpenChange={(open) => {
				if (!open) {
					// Save settings when closing the sheet
					handleLocalSettingsSave()
				}
				setIsOpen(open)
			}}
		>
			<SheetTrigger asChild>
				<Button variant="outline" size="icon" className="h-9 w-9">
					<SettingsIcon />
					<span className="sr-only">Cài đặt</span>
				</Button>
			</SheetTrigger>
			<SheetContent
				side="right"
				className="max-h-[100vh] w-[400px] sm:max-w-[540px] overflow-y-auto"
			>
				<SheetHeader>
					<SheetTitle>Cài đặt</SheetTitle>
				</SheetHeader>
				<div className="grid gap-6 py-4">
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
								Tải ảnh lên
							</Button>
							<Button
								variant="ghost"
								size="icon"
								onClick={() => onBackgroundChange(null)}
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
							{uploadedBackgrounds.map((bg, index) => (
								<div
									key={`uploaded-${index}`}
									className="relative cursor-pointer group"
									onClick={() => onBackgroundChange(bg)}
								>
									<Image
										src={bg}
										alt={`Uploaded background ${index + 1}`}
										width={100}
										height={60}
										className={cn(
											"rounded-md object-cover aspect-video",
											currentBackgroundImage === bg &&
												"ring-2 ring-primary ring-offset-2 ring-offset-background"
										)}
									/>
									{currentBackgroundImage === bg && (
										<CheckCircle className="absolute top-1 right-1 h-5 w-5 text-primary bg-background rounded-full" />
									)}
								</div>
							))}
						</div>
					</div>
					<Separator />
					<div className="space-y-4">
						<Label className="font-medium text-foreground">
							Cài đặt học tập
						</Label>
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
							<Select
								value={language}
								onValueChange={setLanguage}
							>
								<SelectTrigger className="col-span-3">
									<SelectValue placeholder="Chọn một ngôn ngữ" />
								</SelectTrigger>
								<SelectContent>
									{languages.map((lang) => (
										<SelectItem
											key={lang.value}
											value={lang.value}
										>
											{lang.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<Tabs
							value={currentView}
							onValueChange={(value) =>
								onViewChange(value as "flashcards" | "quiz")
							}
							className="w-full"
						>
							<TabsList className="grid w-full grid-cols-2">
								<TabsTrigger value="flashcards">
									Flashcard
								</TabsTrigger>
								<TabsTrigger value="quiz">
									Trắc nghiệm
								</TabsTrigger>
							</TabsList>
							<TabsContent
								value="flashcards"
								className="space-y-4 pt-4"
							>
								<div className="flex items-center justify-between pl-10">
									<Label
										htmlFor="flashcardIsRandom"
										className="text-right"
									>
										Ngẫu nhiên thẻ
									</Label>
									<Switch
										id="flashcardIsRandom"
										checked={flashcardIsRandom}
										onCheckedChange={setFlashcardIsRandom}
									/>
								</div>
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
							</TabsContent>
							<TabsContent
								value="quiz"
								className="space-y-4 pt-4"
							>
								<div className="grid grid-cols-4 items-center gap-4">
									<Label
										htmlFor="quizMax"
										className="text-right"
									>
										Số lượng tối đa
									</Label>
									<Input
										id="quizMax"
										type="number"
										value={quizMax}
										onChange={(e) =>
											setQuizMax(
												parseInt(e.target.value) || 0
											)
										}
										className="col-span-3"
										placeholder="ví dụ: 50"
										{...numericInputProps}
									/>
								</div>
							</TabsContent>
						</Tabs>
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
										<AlertDialogAction
											onClick={handleGenerateNew}
										>
											Vâng, tạo lại
										</AlertDialogAction>
									</AlertDialogFooter>
								</AlertDialogContent>
							</AlertDialog>
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
									checked={visibility.clock}
									onCheckedChange={(checked) =>
										onVisibilityChange({
											...visibility,
											clock: checked,
										})
									}
								/>
								<Label htmlFor="clock-visible">Đồng hồ</Label>
							</div>
							<div className="flex items-center space-x-2">
								<Switch
									id="greeting-visible"
									checked={visibility.greeting}
									onCheckedChange={(checked) =>
										onVisibilityChange({
											...visibility,
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
									checked={visibility.search}
									onCheckedChange={(checked) =>
										onVisibilityChange({
											...visibility,
											search: checked,
										})
									}
								/>
								<Label htmlFor="search-visible">Tìm kiếm</Label>
							</div>
							<div className="flex items-center space-x-2">
								<Switch
									id="quicklinks-visible"
									checked={visibility.quickLinks}
									onCheckedChange={(checked) =>
										onVisibilityChange({
											...visibility,
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
									checked={visibility.learn}
									onCheckedChange={(checked) =>
										onVisibilityChange({
											...visibility,
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
			</SheetContent>
		</Sheet>
	)
}
