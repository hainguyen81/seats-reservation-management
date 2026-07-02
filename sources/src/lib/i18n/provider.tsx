// sources/src/lib/i18n/provider.tsx
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { NextIntlClientProvider } from 'next-intl';

// could not use enviroment variable. `@/` ~ `./src`
const messagesPath = '@/app/messages/*.json';

// =========================================================================
// 🎛️ AUTOMATED DICTIONARY LOADER ENGINE (WEBPACK REQUIRE.CONTEXT)
// =========================================================================
// Create an atomic reactive registry map to host the loaded language JSON objects
const dynamicMessagesMap: Record<string, any> = {};

// 🔥 THE ARCHITECTURE FEATURE FLAG SWITCH:
// We evaluate the current phase environment variable inside the configuration stack [3.2, 4.2].
// If we are NOT in production static compile build phase, boot up the automated scanning radar [3.2]!
if (process.env.NEXT_PHASE !== 'phase-production-build') {
    try {
        const contextLocator = (require as any).context(messagesPath, false, /\.json$/);
        contextLocator.keys().forEach((filePathKey: string) => {
            const localeTokenKey = filePathKey.replace(/^\.\//, '').replace(/\.json$/, '');
            if ((localeTokenKey || '').length) {
                const fileModulePayload = contextLocator(filePathKey);
                dynamicMessagesMap[localeTokenKey] = fileModulePayload.default || fileModulePayload;
                console.log(`📡 [i18n Automation] Successfully compiled locale token from file structure: [ ${localeTokenKey} ]`);
            } else {
                console.log(`🚨 [i18n Automation] Invalid locale token file: [ ${filePathKey} ]`);
            }
        });
    } catch (webpackError: any) {
        console.error('🚨 [i18n Engine Crash] Failed to auto-load dictionaries:', webpackError.message);
    }
}

// Dynamic array automatically tracking folder file configurations time-stamps [3.2]
export const availableLocales: string[] = Object.keys(dynamicMessagesMap);

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
