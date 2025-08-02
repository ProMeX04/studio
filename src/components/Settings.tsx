

"use client"

import { useState, useEffect, useRef } from "react"
import {
	Settings as SettingsIcon,
	CheckCircle,
	Upload,
	Trash2,
	RefreshCw,
	AlertTriangle,
	Loader,
	Menu,
	Mic,
	LogOut,
} from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
	SheetFooter,
} from "@/components/ui/sheet"
import { Label } from "@/components/ui/label"
import { Separator } from "./ui/separator"
import type { ComponentVisibility } from "@/contexts/SettingsContext"
import { Switch } from "./ui/switch"
import Image from "next/image"
import { cn } from "@/lib/utils"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useSettingsContext } from "@/contexts/SettingsContext"
import { useLearningContext } from "@/contexts/LearningContext.firebase"
import { useAuthContext } from "@/contexts/AuthContext"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"

type SettingsScope = "all" 

interface CommonSettingsProps {
	scope: SettingsScope
}

type SettingsProps = CommonSettingsProps

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

const getInitials = (name: string | null | undefined) => {
	if (!name) return 'AI';
	const names = name.split(' ');
	if (names.length > 1) {
		return names[0].charAt(0) + names[names.length - 1].charAt(0);
	}
	return name.charAt(0);
};

export function Settings(props: SettingsProps) {
	const { scope } = props
	const { toast } = useToast()
	const [isSheetOpen, setIsSheetOpen] = useState(false)

	const fileInputRef = useRef<HTMLInputElement>(null)

	// --- CONTEXT HOOKS ---
	const settingsContext = useSettingsContext()
    const learningContext = useLearningContext()
	const { user, signOut } = useAuthContext();

	const handleGenerate = (forceNew: boolean) => {
		if (learningContext) {
			learningContext.onGenerate({ forceNew })
		}
	}

	const handleResetOnboarding = () => {
		if (settingsContext) {
			settingsContext.handleResetOnboarding()
		}
	}

	const handleBackgroundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (settingsContext) {
			const file = e.target.files?.[0]
			if (file) {
				const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
				if (file.size > MAX_FILE_SIZE) {
					toast({
						title: "Lỗi tải lên",
						description: "File quá lớn! Vui lòng chọn ảnh nhỏ hơn 10MB.",
						variant: "destructive",
					})
					return
				}
	
				const reader = new FileReader()
				reader.onload = (event) => {
					const img = document.createElement("img")
					img.onload = () => {
						const canvas = document.createElement("canvas")
						const ctx = canvas.getContext("2d")
	
						if (!ctx) {
							toast({ title: "Lỗi", description: "Không thể xử lý ảnh.", variant: "destructive" })
							return
						}
	
						// Resize logic
						const MAX_WIDTH = 1920
						let width = img.width
						let height = img.height
	
						if (width > MAX_WIDTH) {
							height = (height * MAX_WIDTH) / width
							width = MAX_WIDTH
						}
	
						canvas.width = width
						canvas.height = height
						ctx.drawImage(img, 0, 0, width, height)
	
						// Compress and get data URL as WebP
						const compressedDataUrl = canvas.toDataURL("image/webp", 0.8) // 80% quality
	
						const newUploadedBgs = [
							compressedDataUrl,
							...settingsContext.uploadedBackgrounds,
						].slice(0, MAX_UPLOADED_IMAGES)
						
						settingsContext.onUploadedBackgroundsChange(newUploadedBgs)
						settingsContext.onBackgroundChange(compressedDataUrl)
						toast({ title: "Thành công!", description: "Hình nền đã được nén sang WebP và tải lên."})
					}
					img.onerror = () => {
						toast({ title: "Lỗi", description: "Không thể đọc file ảnh.", variant: "destructive" })
					}
					img.src = event.target?.result as string
				}
				reader.onerror = () => {
					toast({ title: "Lỗi", description: "Không thể đọc file.", variant: "destructive" })
				}
				reader.readAsDataURL(file)
			}
		}
	}

	const renderContentGenerationControls = () => {
		if (!learningContext) return null

		const { isLoading, theorySet, flashcardSet, quizSet, generationStatus } = learningContext;

		const hasContent = theorySet || flashcardSet || quizSet;
		const isGenerating = !!generationStatus;

		return (
			<div className="space-y-4">
				<Label className="font-medium text-foreground">
					Quản lý nội dung học tập
				</Label>

				<div className="p-4 bg-secondary/30 rounded-lg space-y-3">
					{isGenerating ? (
						<div className="flex flex-col items-center text-center">
							<Loader className="w-8 h-8 text-primary animate-spin mb-2" />
							<p className="text-sm text-muted-foreground">{generationStatus}</p>
						</div>
					) : (
						<>
							<p className="text-sm text-muted-foreground">
								{hasContent 
									? `Bạn đang học về chủ đề "${learningContext.topic}". Nhấp vào nút bên dưới để bắt đầu lại với một chủ đề mới.`
									: "Chưa có nội dung học tập nào được tạo."
								}
							</p>
							
							<div className="flex justify-between items-center text-sm pt-2">
								<Label>Lý thuyết</Label>
								<span className="text-muted-foreground">
									{theorySet?.chapters?.length ?? 0} chương
								</span>
							</div>
							<div className="flex justify-between items-center text-sm">
								<Label>Flashcard</Label>
								<span className="text-muted-foreground">
									{flashcardSet?.cards?.length ?? 0} thẻ
								</span>
							</div>
							<div className="flex justify-between items-center text-sm">
								<Label>Trắc nghiệm</Label>
								<span className="text-muted-foreground">
									{quizSet?.questions?.length ?? 0} câu
								</span>
							</div>
						</>
					)}
				</div>
			</div>
		)
	}

	const renderLearnSettings = () => {
		if (!learningContext) return null;

		return (
			<div className="space-y-4">
				{renderContentGenerationControls()}
			</div>
		)
	}
	
	const renderGlobalSettings = () => {
		if (!settingsContext) return null;

		return (
			<div className="space-y-4">
				<div className="space-y-4">
					<Label className="font-medium text-foreground">Hình nền</Label>
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
							onClick={() => settingsContext.onBackgroundChange(null)}
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
						{settingsContext.uploadedBackgrounds.map((bg, index) => (
							<div
								key={`uploaded-${index}`}
								className="relative cursor-pointer group"
								onClick={() => settingsContext.onBackgroundChange(bg)}
							>
								<Image
									src={bg}
									alt={`Uploaded background ${index + 1}`}
									width={100}
									height={60}
									className={cn(
										"rounded-md object-cover aspect-video",
										settingsContext.backgroundImage === bg &&
											"ring-2 ring-primary ring-offset-2 ring-offset-background"
									)}
								/>
								{settingsContext.backgroundImage === bg && (
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
								checked={settingsContext.visibility.advancedVoiceChat}
								onCheckedChange={(checked) =>
									settingsContext.onVisibilityChange({
										...settingsContext.visibility,
										advancedVoiceChat: checked,
									})
								}
							/>
						</div>
						<div className="flex items-center justify-between">
							<Label htmlFor="clock-visible">Đồng hồ</Label>
							<Switch
								id="clock-visible"
								checked={settingsContext.visibility.clock}
								onCheckedChange={(checked) =>
									settingsContext.onVisibilityChange({
										...settingsContext.visibility,
										clock: checked,
									})
								}
							/>
						</div>
						<div className="flex items-center justify-between">
							<Label htmlFor="greeting-visible">Lời chào</Label>
							<Switch
								id="greeting-visible"
								checked={settingsContext.visibility.greeting}
								onCheckedChange={(checked) =>
									settingsContext.onVisibilityChange({
										...settingsContext.visibility,
										greeting: checked,
									})
								}
							/>
						</div>
						<div className="flex items-center justify-between">
							<Label htmlFor="search-visible">Tìm kiếm</Label>
							<Switch
								id="search-visible"
								checked={settingsContext.visibility.search}
								onCheckedChange={(checked) =>
									settingsContext.onVisibilityChange({
										...settingsContext.visibility,
										search: checked,
									})
								}
							/>
						</div>
						<div className="flex items-center justify-between">
							<Label htmlFor="quicklinks-visible">Liên kết nhanh</Label>
							<Switch
								id="quicklinks-visible"
								checked={settingsContext.visibility.quickLinks}
								onCheckedChange={(checked) =>
									settingsContext.onVisibilityChange({
										...settingsContext.visibility,
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

	if (!settingsContext || !learningContext) {
        return null; // Or a loading spinner
    }

	return (
		<Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
			<SheetTrigger asChild>
				{user ? (
					<Button variant="ghost" className="relative h-9 w-9 rounded-full p-0">
						<Avatar className="h-9 w-9">
							<AvatarImage src={user.photoURL ?? ''} alt={user.displayName ?? 'User'} />
							<AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
						</Avatar>
					</Button>
				) : (
					<Button variant="outline" size="icon" className="h-9 w-9">
						<Menu />
						<span className="sr-only">Cài đặt</span>
					</Button>
				)}
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
				
				{user && (
                    <div className="mt-4 p-4 bg-secondary/30 rounded-lg">
                        <div className="flex items-center justify-between">
							<div className="flex items-center gap-3">
								<Avatar>
									<AvatarImage src={user.photoURL ?? ''} alt={user.displayName ?? 'User'} />
									<AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
								</Avatar>
								<div className="flex flex-col">
									<span className="font-semibold">{user.displayName}</span>
									<span className="text-sm text-muted-foreground">{user.email}</span>
								</div>
							</div>
                            <Button variant="ghost" size="icon" onClick={signOut}>
                                <LogOut className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>
                )}

				<Tabs
					defaultValue="learn"
					className="flex-grow flex flex-col mt-4"
				>
					<TabsList className="w-full">
						<TabsTrigger value="learn" className="flex-1">
							Học tập
						</TabsTrigger>
						<TabsTrigger value="global" className="flex-1">
							Giao diện
						</TabsTrigger>
					</TabsList>
					<TabsContent
						value="learn"
						className="flex-grow overflow-y-auto pr-6 pl-1 -mr-6 mt-4"
					>
						<div className="grid gap-6">{renderLearnSettings()}</div>
					</TabsContent>
					<TabsContent
						value="global"
						className="flex-grow overflow-y-auto pr-6 pl-1 -mr-6 mt-4"
					>
						<div className="grid gap-6">{renderGlobalSettings()}</div>
					</TabsContent>
				</Tabs>

				<SheetFooter className="mt-auto pt-4 border-t">
					<AlertDialog>
						<AlertDialogTrigger asChild>
							<Button variant="destructive" className="w-full">
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
									Hành động này sẽ xóa vĩnh viễn tất cả dữ liệu học
									tập hiện tại (lý thuyết, flashcard, trắc nghiệm) và
									bắt đầu lại quá trình tạo chủ đề mới. Cài đặt chung
									của bạn sẽ được giữ lại. Bạn có chắc chắn muốn tiếp
									tục không?
								</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter>
								<AlertDialogCancel>Hủy</AlertDialogCancel>
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
	)
}

    
