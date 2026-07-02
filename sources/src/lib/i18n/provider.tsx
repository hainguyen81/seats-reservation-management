// sources/src/lib/i18n/provider.tsx
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { NextIntlClientProvider } from 'next-intl';

// =========================================================================
// 🎛️ AUTOMATED DICTIONARY LOADER ENGINE (WEBPACK REQUIRE.CONTEXT)
// =========================================================================
// Create an atomic reactive registry map to host the loaded language JSON objects
const dynamicMessagesMap: Record<string, any> = {};
const messagesPath = '../../app/messages';

export const availableLocales: string[] = [];

try {
    /**
     * Leverage Webpack dynamic context parsing capability to scan the directory.
     * Arguments: (directory_path, look_in_subdirectories, regex_file_filter)
     * This looks up exactly 4 levels to target the root '/messages' folder cleanly!
     */
    const contextLocator = require.context(messagesPath, false, /\.json$/);

    // Loop across every discovered JSON file footprint array inside the target folder
    contextLocator.keys().forEach((filePathKey: string) => {
        // Extract the raw file name token to use as the locale key (e.g., './vi.json' -> 'vi')
        const localeKey = filePathKey.replace(/^\.\//, '').replace(/\.json$/, '');

        // Resolve and extract the raw nested JSON dictionary structure from memory cache
        const fileModulePayload = contextLocator(filePathKey);

        // Assign mapped keys dynamically: dynamicMessagesMap['vi'] = viJsonData
        dynamicMessagesMap[localeKey] = fileModulePayload.default || fileModulePayload;

        // 🎯 Push parsed token identifier dynamically into our shared global array [3.2]
        availableLocales.push(localeKey);

        console.log(`📡 [i18n Automation] Successfully compiled locale token from file structure: [ ${localeKey} ]`);
    });
} catch (webpackCompilationError: any) {
    console.error('🚨 [i18n Engine Crash] Failed to auto-load dictionaries:', webpackCompilationError.message);
}

// =========================================================================
// 🌍 STATEFUL LANGUAGE CONTEXT MANAGEMENT LAYERS
// =========================================================================
type LanguageContextType = {
    locale: string;
    setLocale: (locale: string) => void;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function AppLanguageProvider({ children }: { children: React.ReactNode }) {
    // Default to Vietnamese if localStorage footprint is non-existent
    const [locale, setLocaleState] = useState<string>('vi');

    useEffect(() => {
        const savedLocale = localStorage.getItem('app_locale');
        // Ensure the saved storage string matches a valid dynamically loaded dictionary key boundary
        if (savedLocale && dynamicMessagesMap[savedLocale]) {
            setLocaleState(savedLocale);
        }
    }, []);

    const setLocale = (newLocale: string) => {
        if (dynamicMessagesMap[newLocale]) {
            setLocaleState(newLocale);
            localStorage.setItem('app_locale', newLocale);
        } else {
            console.error(`⚠️ [i18n Route Guard] Attempted to switch to un-compiled or missing language pack: ${newLocale}`);
        }
    };

    // Safe fallback mechanism: If selected locale state somehow misses target data, default gracefully
    const ActiveMessagesPayload = dynamicMessagesMap[locale] || {};

    return (
        <LanguageContext.Provider value={{ locale, setLocale }}>
            <NextIntlClientProvider locale={locale} messages={ActiveMessagesPayload} timeZone="Asia/Ho_Chi_Minh"
                // =========================================================================
                // 🔥 FALLBACK: Use text key to show
                // =========================================================================
                // 1. Silent the missing key warning errors logs inside browser console
                onError={(error) => {
                    if (error.code === 'MISSING_MESSAGE') {
                        // Catch missing key traces quietly without breaking runtime compilation threads
                        console.warn(`💡 [i18n Missing Key Dynamic Trace]: ${error.message}`);
                    }
                }}

                // 2. 🔥 If not found translation in file json, then using key to show UI
                getMessageFallback={({ namespace, key }) => {
                    // If using dot notation or nested schemas, it returns the raw trailing key text
                    return key;
                }}
            >
                {children}
            </NextIntlClientProvider>
        </LanguageContext.Provider>
    );
}

export function useAppLanguage() {
    const context = useContext(LanguageContext);
    if (!context) throw new Error('useAppLanguage must execute inside an active AppLanguageProvider fabric!');
    return context;
}
