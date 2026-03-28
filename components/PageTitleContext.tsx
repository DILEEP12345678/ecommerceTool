'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface PageTitleContextType {
  pageTitle: string | null;
  setPageTitle: (title: string | null) => void;
}

const PageTitleContext = createContext<PageTitleContextType>({
  pageTitle: null,
  setPageTitle: () => {},
});

export function usePageTitle() { return useContext(PageTitleContext).pageTitle; }
export function useSetPageTitle() { return useContext(PageTitleContext).setPageTitle; }

export function PageTitleProvider({ children }: { children: ReactNode }) {
  const [pageTitle, setPageTitle] = useState<string | null>(null);
  return (
    <PageTitleContext.Provider value={{ pageTitle, setPageTitle }}>
      {children}
    </PageTitleContext.Provider>
  );
}
