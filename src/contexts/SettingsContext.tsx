

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
import { getDb, DataKey, closeDb } from "@/lib/idb"
import { useAuthContext } from "./AuthContext"

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

	const getUIDBKey = useCallback((key: string) => {
		return `${user?.uid || 'guest'}-${key}`;
	}, [user]);


	useEffect(() => {
		setIsMounted(true)
		// Defer loading until user state is resolved
		if (user !== undefined) {
			loadInitialData();
		}

		return () => {
			closeDb()
			clearAllToastTimeouts()
		}
	}, [user])

	const loadInitialData = useCallback(async () => {
		if (!isMounted) return;

		const db = await getDb()

		const [
			savedVisibilityRes,
			savedBgRes,
			savedUploadedBgsRes,
			onboardingStatusRes,
		] = await Promise.all([
			db.get("data", getUIDBKey("visibility")),
			db.get("data", getUIDBKey("background")),
			db.get("data", getUIDBKey("uploadedBackgrounds")),
			db.get("data", getUIDBKey("hasCompletedOnboarding")),
		])

		const savedVisibility = savedVisibilityRes?.data as ComponentVisibility
		const savedBg = savedBgRes?.data as string
		const savedUploadedBgs = (savedUploadedBgsRes?.data as string[]) || []
		const onboardingCompleted =
			(onboardingStatusRes?.data as boolean) || false

		setHasCompletedOnboarding(onboardingCompleted)
		if (savedBg) setBackgroundImage(savedBg)
		setUploadedBackgrounds(savedUploadedBgs)
		if (savedVisibility) setVisibility(savedVisibility)
	}, [isMounted, getUIDBKey])

	const onBackgroundChange = useCallback(
		async (newBg: string | null) => {
			if (backgroundImage === (newBg ?? "")) return

			const db = await getDb()
			if (newBg) {
				setBackgroundImage(newBg)
				await db.put("data", { id: getUIDBKey("background"), data: newBg })
			} else {
				setBackgroundImage("")
				await db.delete("data", getUIDBKey("background"))
			}
		},
		[backgroundImage, getUIDBKey]
	)

	const onUploadedBackgroundsChange = useCallback(
		async (newUploadedBgs: string[]) => {
			if (uploadedBackgrounds.toString() === newUploadedBgs.toString())
				return

			setUploadedBackgrounds(newUploadedBgs)
			const db = await getDb()
			await db.put("data", {
				id: getUIDBKey("uploadedBackgrounds"),
				data: newUploadedBgs,
			})
		},
		[uploadedBackgrounds, getUIDBKey]
	)

	const onVisibilityChange = useCallback(
		async (newVisibility: ComponentVisibility) => {
			setVisibility(newVisibility)
			const db = await getDb()
			await db.put("data", { id: getUIDBKey("visibility"), data: newVisibility })
		},
		[getUIDBKey]
	)

	const onOnboardingComplete = useCallback(
		async (
			finalTopic: string,
			finalLanguage: string,
			finalModel: string
		) => {
			// This now also updates the learning context state via its own save function
			setHasCompletedOnboarding(true)
			const db = await getDb()
			await db.put("data", { id: getUIDBKey("topic"), data: finalTopic })
			await db.put("data", { id: getUIDBKey("language"), data: finalLanguage })
			await db.put("data", { id: getUIDBKey("model"), data: finalModel })
			await db.put("data", { id: getUIDBKey("hasCompletedOnboarding"), data: true })
		},
		[getUIDBKey]
	)

	const onClearAllData = useCallback(async () => {
		const db = await getDb()
		const allKeys = await db.getAllKeys("data");
		const userKeysToDelete = allKeys.filter(key => key.startsWith(user?.uid || 'guest'));

		const tx = db.transaction("data", "readwrite")
		const store = tx.objectStore("data")
		await Promise.all(userKeysToDelete.map((key) => store.delete(key)))
		await tx.done

		localStorage.removeItem("newtab-ai-layout-v2")

		// Reload the page to reset all state cleanly
		window.location.reload()

		toast({
			title: "Đã xóa dữ liệu",
			description: "Toàn bộ dữ liệu ứng dụng của bạn đã được xóa.",
		})
	}, [toast, user])

	const handleResetOnboarding = useCallback(async () => {
		const db = await getDb()
		const learningKeys: DataKey[] = [
			"flashcards", "flashcardState", "flashcardIndex", "quiz", "quizState",
			"theory", "theoryState", "theoryChapterIndex", "topic", "language",
			"model", "view", "hasCompletedOnboarding"
		];
		const userKeysToDelete = learningKeys.map(key => getUIDBKey(key));
		
		const tx = db.transaction("data", "readwrite")
		const store = tx.objectStore("data")
		await Promise.all(userKeysToDelete.map((key) => store.delete(key)))
		await tx.done

		setHasCompletedOnboarding(false)
		window.location.reload()
	}, [getUIDBKey])

	const value: SettingsContextType = {
		isMounted,
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
