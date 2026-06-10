import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { ImmersiveScene } from "@/components/immersive";
import { PremiumFooter } from "@/components/PremiumFooter";
import { Logo } from "@/components/Logo";

type Props = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
};

export function TrustPage({ title, subtitle, children }: Props) {
  return (
    <ImmersiveScene variant="auth" className="min-h-screen flex flex-col">
      <header className="px-6 lg:px-10 pt-8">
        <Link to="/" className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" /> Aurelius
        </Link>
        <Logo />
      </header>

      <motion.article
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
        className="flex-1 max-w-3xl mx-auto px-6 lg:px-10 py-12 w-full"
      >
        <p className="label-caps mb-4">Trust Center</p>
        <h1 className="font-display text-4xl md:text-5xl tracking-tight mb-3">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground leading-relaxed mb-10">{subtitle}</p>}
        <div className="panel-elevated rounded-3xl p-8 lg:p-10 space-y-6 text-sm text-muted-foreground leading-relaxed">
          {children}
        </div>
      </motion.article>

      <PremiumFooter variant="minimal" className="shrink-0" />
    </ImmersiveScene>
  );
}

export function TrustSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-xl text-foreground tracking-tight mb-3">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
