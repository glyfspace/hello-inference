import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "Styleframe Interview",
  description: "Styleframe's interview template to upload, transcode, and preview videos.",
};

const RootLayout = ({ children }: { children: ReactNode }) => (
  <html lang="en" data-theme="cupcake">
    <body className="bg-base-200 text-base-content">
      {children}
    </body>
  </html>
);

export default RootLayout;
