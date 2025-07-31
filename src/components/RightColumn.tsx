

"use client"

import React from "react"
import { useSettingsContext } from "@/contexts/SettingsContext"
import { ApiKeyGuide } from "@/components/ApiKeyGuide"
import { Learn } from "@/components/Learn"

export default function RightColumn() {
	const {
		visibility,
		hasCompletedOnboarding,
	} = useSettingsContext()

	if (!visibility.learn) {
		return null
	}

	return (
		<div className="relative flex flex-col h-screen overflow-hidden">
			<div className="flex flex-col w-full h-full">
				{hasCompletedOnboarding ? <Learn /> : <ApiKeyGuide />}
			</div>
		</div>
	)
}
