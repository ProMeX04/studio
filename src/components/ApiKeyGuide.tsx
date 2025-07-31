

"use client"

import React, { useState } from "react"
import { useSettingsContext } from "@/contexts/SettingsContext"
import { useLearningContext } from "@/contexts/LearningContext"
import {
	Loader,
	ChevronLeft,
	Sparkles,
	Settings as SettingsIcon,
} from "lucide-react"
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card"
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
import { Label } from "./ui/label"

export function ApiKeyGuide() {
	const { onOnboardingComplete } = useSettingsContext()
	const {
		onGenerate,
		isLoading,
		topic,
		language,
		model,
		onSettingsSave,
	} = useLearningContext()

	const [onboardingStep, setOnboardingStep] = useState(1)
	const [localTopic, setLocalTopic] = useState(topic)
	const [localLanguage, setLocalLanguage] = useState(language || "Vietnamese")
	const [localModel, setLocalModel] = useState(model)

	const handleFinishOnboarding = () => {
		// 1. Save all settings
		onSettingsSave({
			topic: localTopic,
			language: localLanguage,
			model: localModel,
		})
		// 2. Mark onboarding as complete in context
		onOnboardingComplete(localTopic, localLanguage, localModel)
		// 3. Trigger the first generation automatically
		onGenerate(true)
	}

	const handleNextStep = (e?: React.FormEvent) => {
		e?.preventDefault()
		if (onboardingStep === 1) {
			if (!localTopic.trim()) return
		}
		
		if (onboardingStep === 2) {
			handleFinishOnboarding();
		} else {
			setOnboardingStep(onboardingStep + 1)
		}
	}

	const handleBack = () => {
		if (onboardingStep > 1) {
			setOnboardingStep(onboardingStep - 1)
		}
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
							<SettingsIcon className="w-12 h-12 text-primary" />
						</div>
						<CardTitle className="text-3xl font-bold">
							Cài đặt học tập
						</CardTitle>
						<CardDescription className="text-lg mt-2">
							Tinh chỉnh trải nghiệm học tập cho chủ đề "{localTopic}".
						</CardDescription>
					</CardHeader>
					<CardContent className="p-0">
						<form
							onSubmit={handleNextStep}
							className="space-y-4 animate-in fade-in duration-500 delay-300"
						>
							<div className="space-y-2">
								<Label htmlFor="language-select">Ngôn ngữ</Label>
								<Select
									value={localLanguage}
									onValueChange={setLocalLanguage}
								>
									<SelectTrigger
										id="language-select"
										className="text-base h-12"
									>
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
							<div className="space-y-2">
								<Label htmlFor="model-select">Model AI</Label>
								<Select
									value={localModel}
									onValueChange={setLocalModel}
								>
									<SelectTrigger
										id="model-select"
										className="text-base h-12"
									>
										<SelectValue placeholder="Chọn một model" />
									</SelectTrigger>
									<SelectContent>
										{models.map((m) => (
											<SelectItem
												key={m.value}
												value={m.value}
											>
												{m.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<p className="text-xs text-muted-foreground px-1">
									Gemini Flash nhanh và hiệu quả, trong khi Pro mạnh mẽ
									và chính xác hơn.
								</p>
							</div>
							<Button
								type="submit"
								className="w-full h-12 !mt-6"
								disabled={isLoading}
							>
								{isLoading ? (
									<>
										<Loader className="animate-spin mr-2 h-4 w-4" />
										Đang tạo...
									</>
								) : (
									"Bắt đầu học"
								)}
							</Button>
						</form>
					</CardContent>
				</Card>
			</div>
		)
	}

	return null
}
