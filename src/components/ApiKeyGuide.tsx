
"use client"

import React, { useState, useCallback } from "react"
import { useAppContext } from "@/contexts/AppContext"
import {
	Loader,
	ChevronLeft,
	Award,
	Settings as SettingsIcon,
	CheckCircle,
	KeyRound,
	ExternalLink,
	Sparkles,
	BookOpen,
	Menu,
	Languages,
	Plus,
	BrainCircuit,
} from "lucide-react"
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card"
import { Settings } from "@/components/Settings"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import { languages, models } from "./Settings"

export function ApiKeyGuide() {
    const {
        onOnboardingComplete,
        topic,
        language,
        model,
        apiKeys,
        onApiKeysChange,
        onSettingsSave,
        onGenerate,
        isLoading,
    } = useAppContext();

	const [onboardingStep, setOnboardingStep] = useState(1)
	const [localTopic, setLocalTopic] = useState(topic)
	const [localLanguage, setLocalLanguage] = useState(language || "Vietnamese")
	const [localModel, setLocalModel] = useState(model)

	const handleNextStep = (e?: React.FormEvent) => {
		e?.preventDefault()
		if (onboardingStep === 1 && !localTopic.trim()) return
		setOnboardingStep(onboardingStep + 1)
	}

	const handleBack = () => {
		if (onboardingStep > 1) {
			setOnboardingStep(onboardingStep - 1)
		}
	}

	const handleFinishOnboarding = () => {
		onOnboardingComplete(localTopic, localLanguage, localModel)
	}

	const handleGenerateOnboardingContent = useCallback(() => {
		// First, save the settings from the onboarding flow
		if (onSettingsSave) {
			onSettingsSave({
				topic: localTopic,
				language: localLanguage,
			})
		}
		// Then, trigger generation
		if (onGenerate) {
			onGenerate(true)
		}
	}, [onGenerate, onSettingsSave, localTopic, localLanguage])

	const onboardingApiKeysProps = {
		apiKeys: apiKeys,
		onApiKeysChange: onApiKeysChange,
		onSettingsChanged: handleNextStep,
        isLoading: false,
	}

	const onboardingGenerateProps = {
		onGenerate: handleGenerateOnboardingContent,
		isLoading: isLoading,
	}

	if (onboardingStep === 1) {
		return (
			<div className="w-full h-full flex flex-col items-center justify-center p-4">
				<Card className="w-full max-w-2xl text-center p-8 bg-background/80 backdrop-blur-sm animate-in fade-in duration-500">
					<CardHeader className="p-0 mb-6">
						<div className="flex items-center justify-center gap-4 mb-4">
							<Sparkles className="w-12 h-12 text-primary" />
						</div>
						<CardTitle className="text-3xl font-bold">
							Để bắt đầu, bạn muốn học về chủ đề gì?
						</CardTitle>
						<CardDescription className="text-lg mt-2">
							Nhập một chủ đề bất kỳ và AI sẽ giúp bạn học nó.
						</CardDescription>
					</CardHeader>
					<CardContent className="p-0">
						<form
							onSubmit={handleNextStep}
							className="flex items-center gap-2 animate-in fade-in duration-500 delay-300"
						>
							<Input
								value={localTopic}
								onChange={(e) => setLocalTopic(e.target.value)}
								placeholder="ví dụ: Lịch sử La Mã, Lập trình React..."
								className="text-base h-12"
								autoFocus
							/>
							<Button type="submit" className="h-12">
								Tiếp tục
							</Button>
						</form>
					</CardContent>
				</Card>
			</div>
		)
	}

	if (onboardingStep === 2) {
		return (
			<div className="w-full h-full flex flex-col items-center justify-center p-4">
				<Card className="w-full max-w-2xl text-center p-8 bg-background/80 backdrop-blur-sm animate-in fade-in duration-500">
					<CardHeader className="p-0 mb-6">
						<Button
							variant="ghost"
							className="absolute top-4 left-4"
							onClick={handleBack}
						>
							<ChevronLeft className="mr-2 h-4 w-4" /> Quay lại
						</Button>
						<div className="flex items-center justify-center gap-4 mb-4 pt-8">
							<Languages className="w-12 h-12 text-primary" />
						</div>
						<CardTitle className="text-3xl font-bold">
							Tuyệt vời! Chủ đề của bạn là "{localTopic}"
						</CardTitle>
						<CardDescription className="text-lg mt-2 space-y-1">
							<p>Bây giờ, hãy chọn ngôn ngữ đầu ra.</p>
							<p className="text-sm text-muted-foreground">
								Đây là ngôn ngữ mà AI sẽ sử dụng để tạo nội dung học tập cho bạn.
							</p>
						</CardDescription>
					</CardHeader>
					<CardContent className="p-0">
						<form
							onSubmit={handleNextStep}
							className="flex items-center gap-2 animate-in fade-in duration-500 delay-300"
						>
							<Select value={localLanguage} onValueChange={setLocalLanguage}>
								<SelectTrigger className="text-base h-12">
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
							<Button type="submit" className="h-12">
								Tiếp tục
							</Button>
						</form>
					</CardContent>
				</Card>
			</div>
		)
	}

	if (onboardingStep === 3) {
		return (
			<div className="w-full h-full flex flex-col items-center justify-center p-4">
				<Card className="w-full max-w-2xl text-left p-8 bg-background/80 backdrop-blur-sm animate-in fade-in duration-500">
					<CardHeader className="p-0 mb-6 text-center">
						<Button
							variant="ghost"
							className="absolute top-4 left-4"
							onClick={handleBack}
						>
							<ChevronLeft className="mr-2 h-4 w-4" /> Quay lại
						</Button>
						<div className="flex items-center justify-center gap-4 mb-4 pt-8">
							<KeyRound className="w-12 h-12 text-primary" />
						</div>
						<CardTitle className="text-3xl font-bold">
							Chỉ còn một bước nhỏ!
						</CardTitle>
						<CardDescription className="text-lg mt-2">
							Để tạo nội dung, bạn cần có API Key (miễn phí) từ Google.
						</CardDescription>
					</CardHeader>
					<CardContent className="p-0 animate-in fade-in duration-500 delay-300">
						<div className="bg-secondary/30 p-4 rounded-lg space-y-2">
							<h4 className="font-semibold text-lg">API Key là gì?</h4>
							<p className="text-muted-foreground">
								Nó giống như một chiếc chìa khóa cho phép ứng dụng này truy cập
								vào khả năng của Google Gemini AI để tạo nội dung học tập cho
								bạn. Việc sử dụng key của riêng bạn là hoàn toàn miễn phí trong
								giới hạn cho phép của Google.
							</p>
						</div>
					</CardContent>
					<CardFooter className="p-0 mt-6 flex flex-col gap-2">
						<Button asChild className="w-full h-12">
							<a
								href="https://aistudio.google.com/app/apikey"
								target="_blank"
								rel="noopener noreferrer"
							>
								Lấy API Key tại đây <ExternalLink className="ml-2 h-4 w-4" />
							</a>
						</Button>
						<Button
							onClick={() => handleNextStep()}
							variant="outline"
							className="w-full h-12"
						>
							Tôi đã có key
						</Button>
					</CardFooter>
				</Card>
			</div>
		)
	}

	if (onboardingStep === 4) {
		return (
			<div className="w-full h-full flex flex-col items-center justify-center p-4">
				<Card className="w-full max-w-2xl text-left p-8 bg-background/80 backdrop-blur-sm animate-in fade-in duration-500">
					<CardHeader className="p-0 mb-6 text-center">
						<Button
							variant="ghost"
							className="absolute top-4 left-4"
							onClick={handleBack}
						>
							<ChevronLeft className="mr-2 h-4 w-4" /> Quay lại
						</Button>
						<div className="flex items-center justify-center gap-4 mb-4 pt-8">
							<KeyRound className="w-12 h-12 text-primary" />
						</div>
						<CardTitle className="text-3xl font-bold">
							Thêm API Key của bạn
						</CardTitle>
						<CardDescription className="text-lg mt-2">
							Dán API Key bạn vừa tạo vào ô bên dưới. Bạn nên thêm ít nhất 3
							key để có trải nghiệm tốt nhất.
						</CardDescription>
					</CardHeader>
					<CardContent className="p-0 animate-in fade-in duration-500 delay-300">
						<Settings {...onboardingApiKeysProps} scope="learn-onboarding" />
					</CardContent>
				</Card>
			</div>
		)
	}

	if (onboardingStep === 5) {
		return (
			<div className="w-full h-full flex flex-col items-center justify-center p-4">
				<Card className="w-full max-w-2xl text-center p-8 bg-background/80 backdrop-blur-sm animate-in fade-in duration-500">
					<CardHeader className="p-0 mb-6">
						<Button
							variant="ghost"
							className="absolute top-4 left-4"
							onClick={handleBack}
						>
							<ChevronLeft className="mr-2 h-4 w-4" /> Quay lại
						</Button>
						<div className="flex items-center justify-center gap-4 mb-4 pt-8">
							<BrainCircuit className="w-12 h-12 text-primary" />
						</div>
						<CardTitle className="text-3xl font-bold">Chọn Model AI</CardTitle>
						<CardDescription className="text-lg mt-2 space-y-1">
							<p>Chọn model AI bạn muốn sử dụng.</p>
							<p className="text-sm text-muted-foreground">
								Gemini 1.5 Flash nhanh và hiệu quả, trong khi 1.5 Pro mạnh mẽ
								hơn.
							</p>
						</CardDescription>
					</CardHeader>
					<CardContent className="p-0">
						<form
							onSubmit={handleNextStep}
							className="flex items-center gap-2 animate-in fade-in duration-500 delay-300"
						>
							<Select value={localModel} onValueChange={setLocalModel}>
								<SelectTrigger className="text-base h-12">
									<SelectValue placeholder="Chọn một model" />
								</SelectTrigger>
								<SelectContent>
									{models.map((m) => (
										<SelectItem key={m.value} value={m.value}>
											{m.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<Button type="submit" className="h-12">
								Tiếp tục
							</Button>
						</form>
					</CardContent>
				</Card>
			</div>
		)
	}

	if (onboardingStep === 6) {
		return (
			<div className="w-full h-full flex flex-col items-center justify-center p-4">
				<Card className="w-full max-w-2xl text-left p-8 bg-background/80 backdrop-blur-sm animate-in fade-in duration-500">
					<CardHeader className="p-0 mb-6 text-center">
						<Button
							variant="ghost"
							className="absolute top-4 left-4"
							onClick={handleBack}
						>
							<ChevronLeft className="mr-2 h-4 w-4" /> Quay lại
						</Button>
						<div className="flex items-center justify-center gap-4 mb-4 pt-8">
							<Plus className="w-12 h-12 text-primary" />
						</div>
						<CardTitle className="text-3xl font-bold">
							Tạo nội dung đầu tiên
						</CardTitle>
						<CardDescription className="text-lg mt-2">
							Nhấn nút <Plus className="inline w-4 h-4 mx-1" /> để AI bắt đầu
							tạo nội dung học tập cho bạn.
						</CardDescription>
					</CardHeader>
					<CardContent className="p-0 space-y-4 animate-in fade-in duration-500 delay-300">
						<Settings
							{...onboardingGenerateProps}
							scope="learn-onboarding-generate"
						/>
						<p className="text-xs text-muted-foreground text-center px-4">
							Lưu ý: Nếu bạn thoát tab trong khi đang tạo, bạn sẽ cần phải tiếp
							tục quá trình này thủ công bằng cách nhấn nút{" "}
							<Plus className="inline w-3 h-3" /> trong Cài đặt học tập.
						</p>
					</CardContent>
					<CardFooter className="p-0 mt-6">
						<Button onClick={handleNextStep} className="w-full h-12">
							Tiếp tục
						</Button>
					</CardFooter>
				</Card>
			</div>
		)
	}

	if (onboardingStep === 7) {
		return (
			<div className="w-full h-full flex flex-col items-center justify-center p-4">
				<Card className="w-full max-w-2xl text-left p-8 bg-background/80 backdrop-blur-sm animate-in fade-in duration-500">
					<CardHeader className="p-0 mb-6 text-center">
						<div className="flex items-center justify-center gap-4 mb-4">
							<BookOpen className="w-12 h-12 text-primary" />
						</div>
						<CardTitle className="text-3xl font-bold">
							Làm thế nào để tạo nội dung?
						</CardTitle>
						<CardDescription className="text-lg mt-2">
							Bất cứ khi nào bạn muốn tạo hoặc thêm nội dung mới, hãy làm theo
							cách sau.
						</CardDescription>
					</CardHeader>
					<CardContent className="p-0 animate-in fade-in duration-500 delay-300">
						<div className="bg-secondary/30 p-4 rounded-lg space-y-4 text-center">
							<p className="text-lg">
								Nhấn vào nút <strong>Menu</strong>{" "}
								<Menu className="inline-block h-5 w-5 mx-1" /> trên thanh công
								cụ và chọn <strong>Tạo / Tiếp tục</strong>.
							</p>
						</div>
					</CardContent>
					<CardFooter className="p-0 mt-6">
						<Button onClick={handleFinishOnboarding} className="w-full h-12">
							Đã hiểu! Bắt đầu học
						</Button>
					</CardFooter>
				</Card>
			</div>
		)
	}

	return null
}

