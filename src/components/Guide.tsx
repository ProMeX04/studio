

"use client"

import React, { useState } from "react"
import { useSettingsContext } from "@/contexts/SettingsContext"
import { useLearningContext } from "@/contexts/LearningContext.firebase"
import {
	Loader,
	ChevronLeft,
	Sparkles,
	Settings as SettingsIcon,
	BookCopy,
	PlusCircle,
	Download,
	BookOpen,
	BrainCircuit,
	Target,
	Palette,
	MessageSquare,
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
import * as api from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import type { PublicTopicResult } from "@/ai/schemas"
import { ScrollArea } from "./ui/scroll-area"
import { RadioGroup, RadioGroupItem } from "./ui/radio-group"


export function Guide() {
	const { onOnboardingComplete } = useSettingsContext()
	const {
		onGenerate,
		isLoading,
		topic,
		language,
		onSettingsSave,
		generationStatus,
		handleCloneTopic
	} = useLearningContext()

	const { toast } = useToast()

	const [onboardingStep, setOnboardingStep] = useState(1)
	const [localTopic, setLocalTopic] = useState(topic)
	const [localLanguage, setLocalLanguage] = useState(language || "Vietnamese")
	const [isSearching, setIsSearching] = useState(false);
	const [isCloning, setIsCloning] = useState<string | null>(null);
	const [searchResults, setSearchResults] = useState<PublicTopicResult[]>([]);

	// New state for personalization
	const [knowledgeLevel, setKnowledgeLevel] = useState("beginner");
	const [learningGoal, setLearningGoal] = useState("overview");
	const [learningStyle, setLearningStyle] = useState("reading");
	const [tone, setTone] = useState("casual");

	const isGenerating = !!generationStatus;

	const handleSearch = async () => {
		if (!localTopic.trim()) return;
		setIsSearching(true);
		try {
			const response = await api.searchPublicTopics({ query: localTopic });
			setSearchResults(response.results);
			setOnboardingStep(2); // Move to results/options step
		} catch (error: any) {
			toast({
				title: "Lỗi tìm kiếm",
				description: `Không thể tìm kiếm chủ đề: ${error.message}`,
				variant: "destructive"
			});
		} finally {
			setIsSearching(false);
		}
	};

	const handleClone = async (publicTopicId: string) => {
		setIsCloning(publicTopicId);
		try {
			await handleCloneTopic(publicTopicId);
			// The context will handle the rest, including marking onboarding as complete
		} catch (error: any) {
			toast({
				title: "Lỗi sao chép chủ đề",
				description: `Không thể tải về chủ đề: ${error.message}`,
				variant: "destructive"
			});
		} finally {
			setIsCloning(null);
		}
	}

	const handleFinishOnboarding = async () => {
		// 1. Save general settings and wait
		await onSettingsSave({
			topic: localTopic,
			language: localLanguage,
			model: 'gemini-2.5-flash-lite', // Using pro for better personalization
		})
		// 2. Mark onboarding as complete in context
		onOnboardingComplete(localTopic, localLanguage, 'gemini-2.5-flash-lite');
		
		// 3. Trigger the first generation with personalization data and explicit parameters
		onGenerate({
			forceNew: true,
			topic: localTopic,
			language: localLanguage,
			model: 'gemini-2.5-flash-lite',
			personalization: {
				knowledgeLevel,
				learningGoal,
				learningStyle,
				tone,
			}
		})
	}

	const handleNextStep = (e?: React.FormEvent) => {
		e?.preventDefault()
		if (onboardingStep === 1) {
			handleSearch();
		} else if (onboardingStep === 2) {
			// This step is now for showing search results or giving the option to create new
			// The user must explicitly choose to create a new topic
			setOnboardingStep(3);
		} else if (onboardingStep === 3) {
			handleFinishOnboarding();
		}
	}

	const handleBack = () => {
		if (onboardingStep > 1) {
			setOnboardingStep(onboardingStep - 1)
		}
	}

	if (isGenerating) {
		return (
			<div className="w-full h-full flex flex-col items-center justify-center p-4">
				<Card className="w-full max-w-2xl text-center p-8 bg-background/80 backdrop-blur-sm animate-in fade-in duration-500">
					<CardHeader className="p-0 mb-6">
						<div className="flex items-center justify-center gap-4 mb-4">
							<Loader className="w-12 h-12 text-primary animate-spin" />
						</div>
						<CardTitle className="text-3xl font-bold">
							AI đang chuẩn bị tài liệu...
						</CardTitle>
						<CardDescription className="text-lg mt-2">
							{generationStatus}
						</CardDescription>
					</CardHeader>
					<CardContent className="p-0">
						<p className="text-sm text-muted-foreground">
							Quá trình này diễn ra trong nền. Bạn có thể đóng tab này và quay lại sau.
						</p>
					</CardContent>
				</Card>
			</div>
		)
	}

	// Step 1: Enter Topic
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
							Nhập một chủ đề bất kỳ. AI sẽ tìm kiếm các tài liệu có sẵn hoặc tạo mới cho bạn.
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
								disabled={isSearching}
							/>
							<Button type="submit" className="h-12" disabled={isSearching || !localTopic.trim()}>
								{isSearching ? <Loader className="animate-spin" /> : "Tiếp tục"}
							</Button>
						</form>
					</CardContent>
				</Card>
			</div>
		)
	}

	// Step 2: Show Search Results
	if (onboardingStep === 2) {
		return (
			<div className="w-full h-full flex flex-col items-center justify-center p-4">
				<Card className="w-full max-w-3xl text-left p-8 bg-background/80 backdrop-blur-sm animate-in fade-in duration-500">
					<CardHeader className="p-0 mb-6 text-center">
						<Button
							variant="ghost"
							className="absolute top-4 left-4"
							onClick={handleBack}
						>
							<ChevronLeft className="mr-2 h-4 w-4" /> Quay lại
						</Button>
						<div className="flex items-center justify-center gap-4 mb-4 pt-8">
							<BookCopy className="w-12 h-12 text-primary" />
						</div>
						<CardTitle className="text-3xl font-bold">
							Kết quả tìm kiếm cho "{localTopic}"
						</CardTitle>
						<CardDescription className="text-lg mt-2">
							{searchResults.length > 0
								? "Chúng tôi đã tìm thấy một số tài liệu có sẵn. Bạn có thể bắt đầu học ngay hoặc tạo một bộ tài liệu hoàn toàn mới."
								: "Không tìm thấy tài liệu có sẵn. Bạn có muốn tạo một bộ tài liệu mới không?"
							}
						</CardDescription>
					</CardHeader>
					<CardContent className="p-0">
						<div className="space-y-4">
							{searchResults.length > 0 && (
								<ScrollArea className="max-h-[40vh] pr-4">
									<div className="space-y-3">
										{searchResults.map((result) => (
											<div key={result.id} className="p-4 border rounded-lg flex items-center justify-between gap-4 bg-secondary/30">
												<div>
													<h3 className="font-semibold text-lg">{result.topic}</h3>
													<p className="text-sm text-muted-foreground">
														{result.language} | {result.chapterCount} chương, {result.flashcardCount} thẻ, {result.questionCount} câu hỏi
													</p>
												</div>
												<Button onClick={() => handleClone(result.id)} disabled={isCloning !== null}>
													{isCloning === result.id ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
													{isCloning === result.id ? "Đang tải..." : "Bắt đầu học"}
												</Button>
											</div>
										))}
									</div>
								</ScrollArea>
							)}
							<div className="pt-4 border-t">
								<Button onClick={() => setOnboardingStep(3)} className="w-full h-12 text-base">
									<PlusCircle className="mr-2 h-5 w-5" />
									Vẫn tạo chủ đề mới "{localTopic}"
								</Button>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		)
	}

	// Step 3: Personalization Questionnaire
	if (onboardingStep === 3) {
		return (
			<div className="w-full h-full flex items-center justify-center p-4">
				<Card className="w-full max-w-4xl text-left p-8 bg-background/80 backdrop-blur-sm animate-in fade-in duration-500">
					<CardHeader className="p-0 mb-6 text-center">
						<Button variant="ghost" className="absolute top-4 left-4" onClick={handleBack}>
							<ChevronLeft className="mr-2 h-4 w-4" /> Quay lại
						</Button>
						<div className="flex items-center justify-center gap-4 mb-4 pt-8">
							<Sparkles className="w-12 h-12 text-primary" />
						</div>
						<CardTitle className="text-3xl font-bold">
							Cá nhân hóa trải nghiệm học tập
						</CardTitle>
						<CardDescription className="text-lg mt-2">
							Hãy cho AI biết thêm về bạn để tạo ra nội dung phù hợp nhất.
						</CardDescription>
					</CardHeader>
					<CardContent className="p-0">
						<form onSubmit={handleNextStep} className="space-y-8 animate-in fade-in duration-500 delay-300">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
								{/* Left Column */}
								<div className="space-y-6">
									{/* Knowledge Level */}
									<div className="space-y-3">
										<Label className="text-lg font-semibold flex items-center gap-2"><BrainCircuit className="w-5 h-5" /> Trình độ của bạn?</Label>
										<RadioGroup value={knowledgeLevel} onValueChange={setKnowledgeLevel} className="space-y-2">
											<Label className="flex items-center space-x-2 p-3 rounded-md border has-[:checked]:bg-primary/10 has-[:checked]:border-primary cursor-pointer">
												<RadioGroupItem value="beginner" id="level-beginner" />
												<span>Người mới bắt đầu</span>
											</Label>
											<Label className="flex items-center space-x-2 p-3 rounded-md border has-[:checked]:bg-primary/10 has-[:checked]:border-primary cursor-pointer">
												<RadioGroupItem value="intermediate" id="level-intermediate" />
												<span>Đã có kiến thức cơ bản</span>
											</Label>
											<Label className="flex items-center space-x-2 p-3 rounded-md border has-[:checked]:bg-primary/10 has-[:checked]:border-primary cursor-pointer">
												<RadioGroupItem value="advanced" id="level-advanced" />
												<span>Nâng cao / Chuyên gia</span>
											</Label>
										</RadioGroup>
									</div>

									{/* Learning Goal */}
									<div className="space-y-3">
										<Label className="text-lg font-semibold flex items-center gap-2"><Target className="w-5 h-5" /> Mục tiêu chính?</Label>
										<RadioGroup value={learningGoal} onValueChange={setLearningGoal} className="space-y-2">
											<Label className="flex items-center space-x-2 p-3 rounded-md border has-[:checked]:bg-primary/10 has-[:checked]:border-primary cursor-pointer">
												<RadioGroupItem value="overview" id="goal-overview" />
												<span>Nắm tổng quan nhanh</span>
											</Label>
											<Label className="flex items-center space-x-2 p-3 rounded-md border has-[:checked]:bg-primary/10 has-[:checked]:border-primary cursor-pointer">
												<RadioGroupItem value="deep_dive" id="goal-deep-dive" />
												<span>Học sâu để thi hoặc làm việc</span>
											</Label>
											<Label className="flex items-center space-x-2 p-3 rounded-md border has-[:checked]:bg-primary/10 has-[:checked]:border-primary cursor-pointer">
												<RadioGroupItem value="practical" id="goal-practical" />
												<span>Tìm hiểu các ứng dụng thực tế</span>
											</Label>
										</RadioGroup>
									</div>
								</div>

								{/* Right Column */}
								<div className="space-y-6">
									{/* Learning Style */}
									<div className="space-y-3">
										<Label className="text-lg font-semibold flex items-center gap-2"><Palette className="w-5 h-5" /> Phong cách học của bạn?</Label>
										<RadioGroup value={learningStyle} onValueChange={setLearningStyle} className="space-y-2">
											<Label className="flex items-center space-x-2 p-3 rounded-md border has-[:checked]:bg-primary/10 has-[:checked]:border-primary cursor-pointer">
												<RadioGroupItem value="reading" id="style-reading" />
												<span>Thiên về Đọc/Viết (văn bản chi tiết)</span>
											</Label>
											<Label className="flex items-center space-x-2 p-3 rounded-md border has-[:checked]:bg-primary/10 has-[:checked]:border-primary cursor-pointer">
												<RadioGroupItem value="visual" id="style-visual" />
												<span>Thiên về Hình ảnh (sơ đồ, mindmap)</span>
											</Label>
											<Label className="flex items-center space-x-2 p-3 rounded-md border has-[:checked]:bg-primary/10 has-[:checked]:border-primary cursor-pointer">
												<RadioGroupItem value="auditory" id="style-auditory" />
												<span>Thiên về Âm thanh (podcast)</span>
											</Label>
											<Label className="flex items-center space-x-2 p-3 rounded-md border has-[:checked]:bg-primary/10 has-[:checked]:border-primary cursor-pointer">
												<RadioGroupItem value="kinesthetic" id="style-kinesthetic" />
												<span>Thiên về Thực hành (ví dụ, code)</span>
											</Label>
										</RadioGroup>
									</div>

									{/* Tone */}
									<div className="space-y-3">
										<Label className="text-lg font-semibold flex items-center gap-2"><MessageSquare className="w-5 h-5" /> Giọng văn mong muốn?</Label>
										<RadioGroup value={tone} onValueChange={setTone} className="space-y-2">
											<Label className="flex items-center space-x-2 p-3 rounded-md border has-[:checked]:bg-primary/10 has-[:checked]:border-primary cursor-pointer">
												<RadioGroupItem value="formal" id="tone-formal" />
												<span>Học thuật, trang trọng</span>
											</Label>
											<Label className="flex items-center space-x-2 p-3 rounded-md border has-[:checked]:bg-primary/10 has-[:checked]:border-primary cursor-pointer">
												<RadioGroupItem value="casual" id="tone-casual" />
												<span>Thân thiện, gần gũi</span>
											</Label>
										</RadioGroup>
									</div>
								</div>
							</div>
							
							{/* Language and Submit */}
							<div className="space-y-2 pt-6 border-t">
								<Label htmlFor="language-select">Ngôn ngữ</Label>
								<Select value={localLanguage} onValueChange={setLocalLanguage}>
									<SelectTrigger id="language-select" className="text-base h-12">
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

							<Button type="submit" className="w-full h-14 !mt-8 text-lg" disabled={isLoading}>
								{isLoading ? (
									<><Loader className="animate-spin mr-2 h-4 w-4" /> Đang tạo...</>
								) : (
									"Bắt đầu học với AI"
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
