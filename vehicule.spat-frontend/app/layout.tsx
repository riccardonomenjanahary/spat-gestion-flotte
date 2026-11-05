import type { Metadata } from "next";
import { Toaster } from "sonner";
import SelectionBoutonTheme from "@/components/SelectionBoutonTheme";
import "./globals.css";

export const metadata: Metadata = {
  title: "GPA",
  description: "Gestion du parc automobile",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">
        <SelectionBoutonTheme />
        {children}

        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
