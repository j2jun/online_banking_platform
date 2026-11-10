import ChatAgent from "@/components/ChatAgent";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main>
      {children}
      <ChatAgent />
    </main>
  );
}
