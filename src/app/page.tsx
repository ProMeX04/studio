
"use client"

import React from "react"
import { AppProvider, useAppContext } from "@/contexts/AppContext"
import LeftColumn from "@/components/LeftColumn"
import RightColumn from "@/components/RightColumn"
import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "@/components/ui/resizable"


function HomePageContent() {
	const { isMounted, backgroundImage, visibility, onVisibilityChange } = useAppContext()

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
			<ResizablePanelGroup 
				direction="horizontal" 
				className="relative min-h-screen w-full"
				onLayout={(sizes: number[]) => {
					// This is a workaround to handle the case where the panel
					// is programmatically set to invisible.
					if (sizes[1] === 100) {
						onVisibilityChange({ ...visibility, learn: false })
					}
				}}
			>
				<ResizablePanel defaultSize={45} minSize={30}>
					<LeftColumn />
				</ResizablePanel>
				{visibility.learn ? (
					<>
						<ResizableHandle className="bg-transparent" />
						<ResizablePanel 
							defaultSize={55} 
							minSize={30}
							collapsible={true}
							onCollapse={() => {
								onVisibilityChange({ ...visibility, learn: false })
							}}
							onExpand={() => {
								onVisibilityChange({ ...visibility, learn: true })
							}}
						>
							<RightColumn />
						</ResizablePanel>
					</>
				) : null}
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
