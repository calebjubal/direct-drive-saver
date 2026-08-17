import "./globals.css";

export const metadata = { title: "DriveCam — Capture to Google Drive", description: "Capture, review and organize photos directly in Google Drive." };
export const viewport = { width: "device-width", initialScale: 1, maximumScale: 1, themeColor: "#f8f7f2" };
export default function RootLayout({ children }) { return <html lang="en"><body>{children}</body></html>; }
