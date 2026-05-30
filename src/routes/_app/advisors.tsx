import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState } from "react";
import { mockAdvisors } from "@/lib/mock-data";
import { Star, Calendar, MessageSquare, ShieldCheck, MapPin } from "lucide-react";

export const Route = createFileRoute("/_app/advisors")({
  head: () => ({ meta: [{ title: "Advisor Marketplace — Auralis" }] }),
  component: AdvisorsPage,
});

const filters = ["All", "Chartered Accountant", "Tax Lawyer", "Wealth Advisor"];

function AdvisorsPage() {
  const [filter, setFilter] = useState("All");
  const advisors = mockAdvisors.filter((a) => filter === "All" || a.role === filter);

  return (
    <div className="p-5 lg:p-10 max-w-[1400px] mx-auto">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">Concierge Network</p>
          <h1 className="font-display text-4xl tracking-tight">Advisor Marketplace</h1>
          <p className="text-muted-foreground mt-1.5 text-sm">Hand-picked CAs, tax counsel and wealth strategists — vetted by Auralis.</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-success" strokeWidth={1.5} />
          All advisors NDA-bound
        </div>
      </header>

      <div className="flex items-center gap-1 overflow-x-auto mb-8">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 h-10 rounded-full text-xs whitespace-nowrap transition-all ${filter === f ? "bg-foreground text-background" : "hairline bg-card hover:bg-card/70 text-muted-foreground"}`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {advisors.map((a, i) => (
          <motion.div
            key={a.id}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: i * 0.06 }}
            className="glass rounded-2xl p-7 shadow-soft hover:shadow-luxury transition-all group"
          >
            <div className="flex items-start gap-4 mb-5">
              <div className="h-14 w-14 rounded-full bg-gradient-to-br from-primary to-gold/60 grid place-items-center text-base font-display shrink-0">
                {a.initials}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-display text-lg tracking-tight leading-tight">{a.name}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{a.role}</p>
                <div className="flex items-center gap-1.5 mt-2 text-xs">
                  <Star className="h-3 w-3 fill-gold text-gold" />
                  <span className="font-medium">{a.rating}</span>
                  <span className="text-muted-foreground">· {a.reviews} reviews</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 mb-5 min-h-[3rem]">
              {a.expertise.map((e) => (
                <span key={e} className="text-[10px] hairline rounded-md px-2 py-1 text-muted-foreground">{e}</span>
              ))}
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground pb-5 border-b border-border/40">
              <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> Mumbai · BKC</span>
              <span className="text-gold">{a.fee}</span>
            </div>

            <div className="flex gap-2 mt-5">
              <button className="flex-1 h-10 bg-foreground text-background rounded-lg text-xs font-medium hover:bg-foreground/90 transition-colors inline-flex items-center justify-center gap-1.5">
                <Calendar className="h-3 w-3" /> Book
              </button>
              <button className="h-10 w-10 hairline bg-card hover:bg-card/70 rounded-lg grid place-items-center transition-colors">
                <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
