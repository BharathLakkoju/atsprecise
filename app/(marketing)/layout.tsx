import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { LenisProvider } from "@/components/providers/lenis-provider";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LenisProvider>
      <Header />
      <div className="relative overflow-x-hidden">
        {children}
        <Footer />
      </div>
    </LenisProvider>
  );
}
