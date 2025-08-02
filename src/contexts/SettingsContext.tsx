

"use client"

import React, {
	createContext,
	useContext,
	useState,
	useEffect,
	useCallback,
	ReactNode,
} from "react"
import { useToast, clearAllToastTimeouts } from "@/hooks/use-toast"
import { useAuthContext } from "./AuthContext"
import { useFirebaseData } from "@/hooks/use-firebase-data"
import { getFirestore, doc, deleteDoc } from "firebase/firestore"

export interface ComponentVisibility {
	home: boolean
	clock: boolean
	greeting: boolean
	search: boolean
	quickLinks: boolean
	learn: boolean
	advancedVoiceChat: boolean
}

interface SettingsContextType {
	isMounted: boolean
	backgroundImage: string
	visibility: ComponentVisibility
	hasCompletedOnboarding: boolean
	uploadedBackgrounds: string[]
	isLoading: boolean
	onClearAllData: () => void
	onVisibilityChange: (visibility: ComponentVisibility) => void
	onBackgroundChange: (background: string | null) => void
	onUploadedBackgroundsChange: (backgrounds: string[]) => void
	onOnboardingComplete: (
		topic: string,
		language: string,
		model: string
	) => void
	handleResetOnboarding: () => void
	setHasCompletedOnboarding: (value: boolean) => void
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

export function useSettingsContext() {
	const context = useContext(SettingsContext)
	if (!context) {
		throw new Error(
			"useSettingsContext must be used within a SettingsProvider"
		)
	}
	return context
}

export function SettingsProvider({ children }: { children: ReactNode }) {
	const { user } = useAuthContext();
	const [isMounted, setIsMounted] = useState(false)
	const [backgroundImage, setBackgroundImage] = useState("")
	const [uploadedBackgrounds, setUploadedBackgrounds] = useState<string[]>([])
	const [visibility, setVisibility] = useState<ComponentVisibility>({
		home: true,
		clock: true,
		greeting: true,
		search: true,
		quickLinks: true,
		learn: true,
		advancedVoiceChat: true,
	})
	const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false)
	const { toast } = useToast()

	const { saveData, getData, saveMultipleData, isLoading } = useFirebaseData();


	useEffect(() => {
		setIsMounted(true)
		// Defer loading until user state is resolved
		if (user !== undefined) {
			loadInitialData();
		}

		return () => {
			clearAllToastTimeouts()
		}
	}, [user])

	const loadInitialData = useCallback(async () => {
		if (!isMounted || !user?.uid) return;

		try {
			const [
				savedVisibility,
				savedBg,
				savedUploadedBgs,
				onboardingCompleted,
			] = await Promise.all([
				getData("visibility") as Promise<ComponentVisibility | null>,
				getData("background") as Promise<string | null>,
				getData("uploadedBackgrounds") as Promise<string[] | null>,
				getData("hasCompletedOnboarding") as Promise<boolean | null>,
			])

			setHasCompletedOnboarding(onboardingCompleted || false)
			if (savedBg) setBackgroundImage(savedBg)
			setUploadedBackgrounds(savedUploadedBgs || [])
			if (savedVisibility) setVisibility(savedVisibility)
		} catch (error) {
			console.error("Error loading initial data:", error)
			toast({
				title: "Lỗi tải dữ liệu",
				description: "Không thể tải cài đặt của bạn.",
				variant: "destructive",
			})
		}
	}, [isMounted, user?.uid, getData, toast])

	const onBackgroundChange = useCallback(
		async (newBg: string | null) => {
			if (backgroundImage === (newBg ?? "")) return

			try {
				if (newBg) {
					setBackgroundImage(newBg)
					await saveData("background", newBg)
				} else {
					setBackgroundImage("")
					await saveData("background", null)
				}
			} catch (error) {
				console.error("Error saving background:", error)
				toast({
					title: "Lỗi lưu cài đặt",
					description: "Không thể lưu hình nền.",
					variant: "destructive",
				})
			}
		},
		[backgroundImage, saveData, toast]
	)

	const onUploadedBackgroundsChange = useCallback(
		async (newUploadedBgs: string[]) => {
			if (uploadedBackgrounds.toString() === newUploadedBgs.toString())
				return

			try {
				setUploadedBackgrounds(newUploadedBgs)
				await saveData("uploadedBackgrounds", newUploadedBgs)
			} catch (error) {
				console.error("Error saving uploaded backgrounds:", error)
				toast({
					title: "Lỗi lưu cài đặt",
					description: "Không thể lưu hình nền đã tải lên.",
					variant: "destructive",
				})
			}
		},
		[uploadedBackgrounds, saveData, toast]
	)

	const onVisibilityChange = useCallback(
		async (newVisibility: ComponentVisibility) => {
			try {
				setVisibility(newVisibility)
				await saveData("visibility", newVisibility)
			} catch (error) {
				console.error("Error saving visibility:", error)
				toast({
					title: "Lỗi lưu cài đặt",
					description: "Không thể lưu cài đặt hiển thị.",
					variant: "destructive",
				})
			}
		},
		[saveData, toast]
	)

	const onOnboardingComplete = useCallback(
		async (
			finalTopic: string,
			finalLanguage: string,
			finalModel: string
		) => {
			try {
				// This now also updates the learning context state via its own save function
				setHasCompletedOnboarding(true)
				await saveMultipleData({
					topic: finalTopic,
					language: finalLanguage,
					model: finalModel,
					hasCompletedOnboarding: true,
				})
			} catch (error) {
				console.error("Error completing onboarding:", error)
				toast({
					title: "Lỗi hoàn thành thiết lập",
					description: "Không thể lưu cài đặt ban đầu.",
					variant: "destructive",
				})
			}
		},
		[saveMultipleData, toast]
	)

	const onClearAllData = useCallback(async () => {
		if (!user?.uid) return;

		try {
			// Clear all Firebase data for this user
			const firestore = getFirestore();
			const userDocRef = doc(firestore, 'users', user.uid);
			await deleteDoc(userDocRef);

			// Clear localStorage as well
			localStorage.removeItem("newtab-ai-layout-v2")

			toast({
				title: "Đã xóa dữ liệu",
				description: "Toàn bộ dữ liệu ứng dụng của bạn đã được xóa.",
			})

			// Reload the page to reset all state cleanly
			window.location.reload()
		} catch (error) {
			console.error("Error clearing data:", error)
			toast({
				title: "Lỗi xóa dữ liệu",
				description: "Không thể xóa dữ liệu ứng dụng.",
				variant: "destructive",
			})
		}
	}, [user?.uid, toast])

	const handleResetOnboarding = useCallback(async () => {
		if (!user?.uid) return;

		try {
			const learningKeys = [
				"flashcards", "flashcardState", "flashcardIndex", "quiz", "quizState",
				"theory", "theoryState", "theoryChapterIndex", "topic", "language",
				"model", "view", "hasCompletedOnboarding"
			];
			
			// Clear learning-related data from Firebase
			await saveMultipleData(Object.fromEntries(learningKeys.map(key => [key, null])));

			setHasCompletedOnboarding(false)
			
			toast({
				title: "Đã đặt lại thiết lập",
				description: "Tiến trình học tập đã được đặt lại.",
			})
			
			window.location.reload()
		} catch (error) {
			console.error("Error resetting onboarding:", error)
			toast({
				title: "Lỗi đặt lại thiết lập",
				description: "Không thể đặt lại tiến trình học tập.",
				variant: "destructive",
			})
		}
	}, [user?.uid, saveMultipleData, toast])

	const value: SettingsContextType = {
		isMounted,
		isLoading,
		backgroundImage,
		visibility,
		hasCompletedOnboarding,
		uploadedBackgrounds,
		onClearAllData,
		onVisibilityChange,
		onBackgroundChange,
		onUploadedBackgroundsChange,
		onOnboardingComplete,
		handleResetOnboarding,
		setHasCompletedOnboarding,
	}

	return (
		<SettingsContext.Provider value={value}>
			{children}
		</SettingsContext.Provider>
	)
}
