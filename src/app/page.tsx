
"use client"

import React from "react"
import { AppProvider, useAppContext } from "@/contexts/AppContext"
import LeftColumn from "@/components/LeftColumn"
import RightColumn from "@/components/RightColumn"
import { ApiKeyGuide } from "@/components/ApiKeyGuide"
import { Learn } from "@/components/Learn"


function HomePageContent() {
	const { isMounted, backgroundImage, hasCompletedOnboarding, visibility } = useAppContext()

	if (!isMounted) {
		return null
	}

	return (
		<main className="relative min-h-screen w-full lg:grid lg:grid-cols-[1.2fr,1.5fr]">
			{backgroundImage && (
				<div
					className="absolute inset-0 bg-cover bg-center"
					style={{ backgroundImage: `url(${backgroundImage})` }}
				>
					<div className="absolute inset-0 bg-black/60"></div>
				</div>
			)}
			<LeftColumn />
            {visibility.learn && (
                <div className="relative flex flex-col h-screen overflow-hidden">
                    <div className="flex flex-col w-full h-full">
                        {hasCompletedOnboarding ? <Learn /> : <ApiKeyGuide />}
                    </div>
                </div>
            )}
		</main>
	)
}

export default function Home() {
	return (
		<AppProvider>
			<HomePageContent />
		</AppProvider>
	)
}
