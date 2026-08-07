import "./globals.css";

export const metadata = {
  title: "ChatAAI",
  description:
    "Real-time AI research assistant powered by Groq, Tavily, and Supabase.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}