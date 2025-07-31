

"use client"

import React, { ReactNode } from "react"
import { SettingsProvider } from "./SettingsContext"
import { LearningProvider } from "./LearningContext"

/**
 * @fileOverview AppProvider component that nests all individual context providers.
 * This component acts as a single entry point for providing all application-wide contexts,
 * making it easier to manage in the root layout.
 */

export function AppProvider({ children }: { children: ReactNode }) {
	return (
		<SettingsProvider>
			<LearningProvider>
                {children}
            </LearningProvider>
		</SettingsProvider>
	)
}

// A hook to be used in components that need access to EVERYTHING.
// This is discouraged. Components should use the more specific
// useSettingsContext or useLearningContext where possible.
// This is provided for convenience in components like the main page layout.
import { useSettingsContext } from "./SettingsContext"
import { useLearningContext } from "./LearningContext"

export const useAppContext = () => {
    const settings = useSettingsContext();
    const learning = useLearningContext();
    return { ...settings, ...learning };
}
