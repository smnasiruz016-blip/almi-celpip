// Auth pages render inside the root layout, which already provides the
// family GlobalHeader + GlobalFooter. This wrapper just centers the form
// card.
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex flex-1 items-center justify-center bg-almi-bg px-6 py-12">
      <div className="w-full max-w-md">{children}</div>
    </main>
  );
}
