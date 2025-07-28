
"use client"

import React from "react"
import { useAppContext } from "@/contexts/AppContext"
import { ApiKeyGuide } from "@/components/ApiKeyGuide"
import { Learn } from "@/components/Learn"

export default function RightColumn() {
	const {
		visibility,
		hasCompletedOnboarding,
	} = useAppContext()

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
