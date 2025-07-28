
"use client"

import React from "react"
import { AppProvider, useAppContext } from "@/contexts/AppContext"
import LeftColumn from "@/components/LeftColumn"
import { ApiKeyGuide } from "@/components/ApiKeyGuide"
import { Learn } from "@/components/Learn"
import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "@/components/ui/resizable"
import RightColumn from "@/components/RightColumn"


function HomePageContent() {
	const { isMounted, backgroundImage, hasCompletedOnboarding, visibility } = useAppContext()

	if (!isMounted) {
		return null
	}

	return (
		<main className="relative min-h-screen w-full">
			{backgroundImage && (
				<div
					className="absolute inset-0 bg-cover bg-center"
					style={{ backgroundImage: `url(${backgroundImage})` }}
				>
					<div className="absolute inset-0 bg-black/60"></div>
				</div>
			)}
			<ResizablePanelGroup direction="horizontal" className="relative min-h-screen w-full">
				<ResizablePanel defaultSize={45} minSize={30}>
					<LeftColumn />
				</ResizablePanel>
				{visibility.learn && (
					<>
						<ResizableHandle />
						<ResizablePanel defaultSize={55} minSize={30}>
							<RightColumn />
						</ResizablePanel>
					</>
				)}
			</ResizablePanelGroup>
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
