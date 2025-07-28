
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
import { cn } from "@/lib/utils"

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
			>
				<ResizablePanel 
					defaultSize={visibility.home ? 45 : 0}
					minSize={30}
					collapsible={true}
					collapsed={!visibility.home}
					onCollapse={() => {
						onVisibilityChange({ ...visibility, home: false })
					}}
					onExpand={() => {
						onVisibilityChange({ ...visibility, home: true })
					}}
					className={cn(!visibility.home && "hidden")}
				>
					<LeftColumn />
				</ResizablePanel>

				<ResizableHandle className="bg-transparent" />
				
				<ResizablePanel 
					defaultSize={visibility.learn ? 55 : 0}
					minSize={30}
					collapsible={true}
					collapsed={!visibility.learn}
					onCollapse={() => {
						onVisibilityChange({ ...visibility, learn: false })
					}}
					onExpand={() => {
						onVisibilityChange({ ...visibility, learn: true })
					}}
					className={cn(!visibility.learn && "hidden")}
				>
					<RightColumn />
				</ResizablePanel>
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
