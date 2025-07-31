

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
import { useLearningContext } from "./LearningContext"

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
	apiKeys: string[]
	apiKeyIndex: number
	uploadedBackgrounds: string[]
	onClearAllData: () => void
	onVisibilityChange: (visibility: ComponentVisibility) => void
	onBackgroundChange: (background: string | null) => void
	onUploadedBackgroundsChange: (backgrounds: string[]) => void
	onApiKeysChange: (apiKeys: string[]) => void
	handleApiKeyIndexChange: (index: number) => void
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
	const [apiKeys, setApiKeys] = useState<string[]>([])
	const [apiKeyIndex, setApiKeyIndex] = useState(0)
	const { toast } = useToast()

	useEffect(() => {
		setIsMounted(true)
		loadInitialData()

		return () => {
			closeDb()
			clearAllToastTimeouts()
		}
	}, [])

	const loadInitialData = useCallback(async () => {
		const db = await getDb()

		// Migration from single 'apiKey' to 'apiKeys'
		const oldApiKeyRes = await db.get("data", "apiKey" as any)
		if (oldApiKeyRes?.data && typeof oldApiKeyRes.data === "string") {
			await db.put("data", { id: "apiKeys", data: [oldApiKeyRes.data] })
			await db.delete("data", "apiKey" as any)
		}

		const [
			savedApiKeysRes,
			savedApiKeyIndexRes,
			savedVisibilityRes,
			savedBgRes,
			savedUploadedBgsRes,
			onboardingStatusRes,
		] = await Promise.all([
			db.get("data", "apiKeys"),
			db.get("data", "apiKeyIndex"),
			db.get("data", "visibility"),
			db.get("data", "background"),
			db.get("data", "uploadedBackgrounds"),
			db.get("data", "hasCompletedOnboarding"),
		])

		const savedApiKeys = (savedApiKeysRes?.data as string[]) || []
		const savedApiKeyIndex = (savedApiKeyIndexRes?.data as number) || 0
		const savedVisibility = savedVisibilityRes?.data as ComponentVisibility
		const savedBg = savedBgRes?.data as string
		const savedUploadedBgs = (savedUploadedBgsRes?.data as string[]) || []
		const onboardingCompleted =
			(onboardingStatusRes?.data as boolean) || false

		setHasCompletedOnboarding(onboardingCompleted)
		if (savedApiKeys) setApiKeys(savedApiKeys)
		setApiKeyIndex(
			savedApiKeyIndex < savedApiKeys.length ? savedApiKeyIndex : 0
		)
		if (savedBg) setBackgroundImage(savedBg)
		setUploadedBackgrounds(savedUploadedBgs)
		if (savedVisibility) setVisibility(savedVisibility)
	}, [])

	const handleApiKeyIndexChange = useCallback(
		async (index: number) => {
			if (apiKeyIndex === index) return
			setApiKeyIndex(index)
			const db = await getDb()
			await db.put("data", { id: "apiKeyIndex", data: index })
		},
		[apiKeyIndex]
	)

	const onApiKeysChange = useCallback(
		async (newApiKeys: string[]) => {
			setApiKeys(newApiKeys)
			const currentKeyIndex =
				apiKeyIndex >= newApiKeys.length ? 0 : apiKeyIndex
			setApiKeyIndex(currentKeyIndex)
			const db = await getDb()
			await db.put("data", { id: "apiKeys", data: newApiKeys })
			await db.put("data", { id: "apiKeyIndex", data: currentKeyIndex })
		},
		[apiKeyIndex]
	)

	const onBackgroundChange = useCallback(
		async (newBg: string | null) => {
			if (backgroundImage === (newBg ?? "")) return

			const db = await getDb()
			if (newBg) {
				setBackgroundImage(newBg)
				await db.put("data", { id: "background", data: newBg })
			} else {
				setBackgroundImage("")
				await db.delete("data", "background")
			}
		},
		[backgroundImage]
	)

	const onUploadedBackgroundsChange = useCallback(
		async (newUploadedBgs: string[]) => {
			if (uploadedBackgrounds.toString() === newUploadedBgs.toString())
				return

			setUploadedBackgrounds(newUploadedBgs)
			const db = await getDb()
			await db.put("data", {
				id: "uploadedBackgrounds",
				data: newUploadedBgs,
			})
		},
		[uploadedBackgrounds]
	)

	const onVisibilityChange = useCallback(
		async (newVisibility: ComponentVisibility) => {
			setVisibility(newVisibility)
			const db = await getDb()
			await db.put("data", { id: "visibility", data: newVisibility })
		},
		[]
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
			await db.put("data", { id: "topic", data: finalTopic })
			await db.put("data", { id: "language", data: finalLanguage })
			await db.put("data", { id: "model", data: finalModel })
			await db.put("data", { id: "hasCompletedOnboarding", data: true })
		},
		[]
	)

	const onClearAllData = useCallback(async () => {
		const db = await getDb()
		const keysToDelete: DataKey[] = [
			"flashcards",
			"flashcardState",
			"flashcardIndex",
			"quiz",
			"quizState",
			"theory",
			"theoryState",
			"theoryChapterIndex",
			"topic",
			"language",
			"model",
			"view",
			"visibility",
			"background",
			"uploadedBackgrounds",
			"apiKeys",
			"apiKeyIndex",
			"hasCompletedOnboarding",
			"generationProgress",
		]

		const tx = db.transaction("data", "readwrite")
		const store = tx.objectStore("data")
		await Promise.all(keysToDelete.map((key) => store.delete(key)))
		await tx.done

		localStorage.removeItem("newtab-ai-layout-v2")

		// Reload the page to reset all state cleanly
		window.location.reload()

		toast({
			title: "Đã xóa dữ liệu",
			description: "Toàn bộ dữ liệu ứng dụng đã được xóa.",
		})
	}, [toast])

	const handleResetOnboarding = useCallback(async () => {
		const db = await getDb()
		// Only clear learning data and onboarding status
		const keysToDelete: DataKey[] = [
			"flashcards",
			"flashcardState",
			"flashcardIndex",
			"quiz",
			"quizState",
			"theory",
			"theoryState",
			"theoryChapterIndex",
			"topic",
			"language",
			"model",
			"view",
			"generationProgress",
			"hasCompletedOnboarding",
		]
		const tx = db.transaction("data", "readwrite")
		const store = tx.objectStore("data")
		await Promise.all(keysToDelete.map((key) => store.delete(key)))
		await tx.done

		setHasCompletedOnboarding(false)
		window.location.reload()
	}, [])

	const value: SettingsContextType = {
		isMounted,
		backgroundImage,
		visibility,
		hasCompletedOnboarding,
		apiKeys,
		apiKeyIndex,
		uploadedBackgrounds,
		onClearAllData,
		onVisibilityChange,
		onBackgroundChange,
		onUploadedBackgroundsChange,
		onApiKeysChange,
		handleApiKeyIndexChange,
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
