
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
import { Settings } from "@/components/Settings"

function HomePageContent() {
	const { 
		isMounted, 
		backgroundImage, 
		visibility, 
		onVisibilityChange,
		onClearAllData,
		onBackgroundChange,
		uploadedBackgrounds,
		onUploadedBackgroundsChange,
	} = useAppContext()

	if (!isMounted) {
		return null
	}

	const globalSettingsProps = {
        onClearAllData,
        onVisibilityChange,
        onBackgroundChange,
        onUploadedBackgroundsChange,
        visibility,
        uploadedBackgrounds,
        currentBackgroundImage: backgroundImage,
    };

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
			
			<div className="absolute top-0 left-0 p-4 sm:p-8 md:p-12 z-20">
                <Settings {...globalSettingsProps} scope="global" />
            </div>

			<ResizablePanelGroup 
				direction="horizontal" 
				className="relative min-h-screen w-full"
				onLayout={(sizes: number[]) => {
					if (sizes.length === 2) {
						if (sizes[0] === 0) onVisibilityChange({ ...visibility, home: false, learn: true });
						if (sizes[1] === 0) onVisibilityChange({ ...visibility, home: true, learn: false });
					}
				}}
			>
				{visibility.home && (
					<ResizablePanel 
						defaultSize={45} 
						minSize={30}
						collapsible={true}
						onCollapse={() => {
							onVisibilityChange({ ...visibility, home: false })
						}}
						onExpand={() => {
							onVisibilityChange({ ...visibility, home: true })
						}}
					>
						<LeftColumn />
					</ResizablePanel>
				)}

				{visibility.home && visibility.learn && (
					<ResizableHandle className="bg-transparent" />
				)}
				
				{visibility.learn && (
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
