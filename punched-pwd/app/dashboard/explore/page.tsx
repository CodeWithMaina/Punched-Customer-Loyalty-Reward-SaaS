"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { businessesApi } from "@/lib/api/businesses";
import { loyaltyApi } from "@/lib/api/loyalty";
import type { Business, LoyaltyCard, LoyaltyProgram } from "@/types";
import { EmptyState as SharedEmptyState } from "@/components/ui";
import {
  Search, MapPin, Loader2, Store, Sparkles, Star,
  TrendingUp, Gift, SlidersHorizontal, X, CheckCircle,
} from "lucide-react";
import { FilterSheet, FilterChips, SortOptions } from "@/components/ui/FilterSheet";

type TabType = "businesses" | "programs";
type SortKey = "default" | "az" | "za";

const CATEGORIES = ["All", "Cafe", "Food", "Fitness", "Beauty", "Health", "Retail", "Other"];
const CATEGORY_EMOJIS: Record<string, string> = {
  Cafe: "☕", Food: "🍽️", Fitness: "💪", Beauty: "💅", Health: "🌿", Retail: "🛍️", Other: "✨",
};

/** Flatten a business + all its programs into searchable text */
function businessSearchText(b: Business): string {
  const programs = b.loyaltyPrograms ?? (b.loyaltyProgram ? [b.loyaltyProgram] : []);
  const programText = programs.map((p) => `${p.name} ${p.rewardDescription} ${p.rewardValue} KES`).join(" ");
  return `${b.name} ${b.category} ${b.location ?? ""} ${b.description ?? ""} ${programText}`.toLowerCase();
}

/** Score a business for relevance to a query */
function matchScore(b: Business, terms: string[]): number {
  const text = businessSearchText(b);
  return terms.reduce((acc, t) => acc + (text.includes(t) ? 1 : 0), 0);
}

interface ProgramWithBiz extends LoyaltyProgram {
  businessName: string;
  businessLogoUrl?: string;
  businessId: string;
  businessCategory: string;
}

export default function ExplorePage() {
  useRoleGuard("Customer");
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [myCards, setMyCards] = useState<LoyaltyCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<TabType>("businesses");
  const [activeCategory, setActiveCategory] = useState("All");
  const [sort, setSort] = useState<SortKey>("default");
  const [showFilters, setShowFilters] = useState(false);

  const load = useCallback((q: string, cat: string) => {
    setIsLoading(true);
    businessesApi.list({ search: q || undefined, category: cat === "All" ? undefined : cat, pageSize: 100 })
      .then((res) => { if (res.success && res.data) setBusinesses(res.data); })
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(search, activeCategory), 300);
    return () => clearTimeout(t);
  }, [search, activeCategory, load]);

  useEffect(() => {
    loyaltyApi.getMyCards().then((res) => { if (res.success && res.data) setMyCards(res.data); });
  }, []);

  const enrolledBusinessIds = new Set(myCards.map((c) => c.businessId));
  const searchTerms = search.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const isFiltered = search.trim() !== "" || activeCategory !== "All";

  // Filtered + sorted businesses
  const filteredBusinesses = useMemo(() => {
    let list = [...businesses];
    if (searchTerms.length > 0) {
      list = list.filter((b) => matchScore(b, searchTerms) > 0);
      list.sort((a, b) => matchScore(b, searchTerms) - matchScore(a, searchTerms));
    }
    if (sort === "az") list.sort((a, b) => a.name.localeCompare(b.name));
    if (sort === "za") list.sort((a, b) => b.name.localeCompare(a.name));
    return list;
  }, [businesses, searchTerms, sort]);

  // Flatten all programs from all businesses
  const allPrograms = useMemo<ProgramWithBiz[]>(() => {
    return businesses.flatMap((b) => {
      const progs = b.loyaltyPrograms?.filter((p) => p.isActive) ?? (b.loyaltyProgram ? [b.loyaltyProgram] : []);
      return progs.map((p) => ({
        ...p,
        businessName: b.name,
        businessLogoUrl: b.logoUrl,
        businessId: b.id,
        businessCategory: b.category,
      }));
    });
  }, [businesses]);

  const filteredPrograms = useMemo(() => {
    let list = [...allPrograms];
    if (searchTerms.length > 0) {
      list = list.filter((p) => {
        const text = `${p.name} ${p.rewardDescription} ${p.rewardValue} ${p.businessName} ${p.businessCategory}`.toLowerCase();
        return searchTerms.some((t) => text.includes(t));
      });
      list.sort((a, b) => {
        const scoreA = searchTerms.reduce((acc, t) => acc + (`${a.name} ${a.rewardDescription} ${a.businessName}`.toLowerCase().includes(t) ? 1 : 0), 0);
        const scoreB = searchTerms.reduce((acc, t) => acc + (`${b.name} ${b.rewardDescription} ${b.businessName}`.toLowerCase().includes(t) ? 1 : 0), 0);
        return scoreB - scoreA;
      });
    }
    if (sort === "az") list.sort((a, b) => a.businessName.localeCompare(b.businessName));
    if (sort === "za") list.sort((a, b) => b.businessName.localeCompare(a.businessName));
    return list;
  }, [allPrograms, searchTerms, sort]);

  const enrolledBusinesses = filteredBusinesses.filter((b) => enrolledBusinessIds.has(b.id));
  const newBusinesses = filteredBusinesses.filter((b) => !enrolledBusinessIds.has(b.id));

  return (
    <div className="max-w-lg mx-auto relative overflow-x-hidden">
      {/* Watermark */}
      <div aria-hidden className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none z-0">
        <span
          className="font-extrabold text-[26vw] whitespace-nowrap text-white opacity-[0.02]"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          PUNCHED
        </span>
      </div>

      {/* Sticky search + tabs */}
      <div className="sticky top-[57px] z-10 bg-[var(--background)] px-5 pt-6 pb-4 space-y-5">
        {/* Heading */}
        <h1
          className="text-xl md:text-2xl font-bold tracking-tight uppercase text-[var(--text-primary)]"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          Select Location
        </h1>

        {/* Search */}
        <div className="flex gap-3">
          <div className="relative flex-1 group">
            <Search className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)] group-focus-within:text-[var(--text-primary)] transition-colors" />
            <input type="text" placeholder="Search businesses, rewards…"
              value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-8 py-3 bg-transparent border-b border-[var(--border)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--text-primary)] focus:bg-[var(--surface-raised)] transition-all" />
            {search && (
              <button onClick={() => setSearch("")} aria-label="Clear search" className="absolute right-0 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <button onClick={() => setShowFilters((v) => !v)} aria-label="Toggle filters"
            className={`h-11 w-11 border flex items-center justify-center flex-shrink-0 transition-colors ${showFilters ? "border-[var(--text-primary)] bg-[var(--surface-raised)] text-[var(--text-primary)]" : "border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--text-secondary)]"}`}>
            <SlidersHorizontal className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        <div role="tablist" aria-label="Explore tabs" className="flex items-center gap-2">
          {(["businesses", "programs"] as TabType[]).map((tab) => (
            <button key={tab} role="tab" aria-selected={activeTab === tab} onClick={() => setActiveTab(tab)}
              className={`text-[10px] tracking-[0.15em] uppercase font-bold px-3 py-1.5 border transition-colors ${
                activeTab === tab
                  ? "border-[var(--text-primary)] text-[var(--text-primary)] bg-[var(--surface-raised)]"
                  : "border-[var(--border)] text-[var(--text-tertiary)] hover:border-[var(--text-secondary)]"
              }`}>
              {tab === "businesses"
                ? `Business${isFiltered ? ` (${filteredBusinesses.length})` : ""}`
                : `Program${isFiltered ? ` (${filteredPrograms.length})` : ""}`}
            </button>
          ))}
        </div>

        {/* Active filter pills (always visible when filtered) */}
        {(activeCategory !== "All" || sort !== "default") && !showFilters && (
          <div className="flex gap-1.5 flex-wrap">
            {activeCategory !== "All" && (
              <span className="inline-flex items-center gap-1 bg-brand-surface text-brand text-xs font-semibold px-2.5 py-1 rounded-full">
                {CATEGORY_EMOJIS[activeCategory] ?? ""} {activeCategory}
                <button onClick={() => setActiveCategory("All")} className="hover:text-brand-dark"><X className="h-3 w-3" /></button>
              </span>
            )}
            {sort !== "default" && (
              <span className="inline-flex items-center gap-1 bg-[var(--border-light)] text-[var(--text-secondary)] text-xs font-semibold px-2.5 py-1 rounded-full">
                {sort === "az" ? "A–Z" : "Z–A"}
                <button onClick={() => setSort("default")} className="hover:text-[var(--text-primary)]"><X className="h-3 w-3" /></button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* FilterSheet — mobile bottom sheet / desktop inline */}
      <div className="px-5">
        <FilterSheet open={showFilters} onClose={() => setShowFilters(false)} title="Filter & Sort">
          <FilterChips label="Category" options={CATEGORIES} value={activeCategory} onChange={setActiveCategory} emojis={CATEGORY_EMOJIS} />
          <SortOptions
            options={[{ key: "default", label: "Relevant" }, { key: "az", label: "A–Z" }, { key: "za", label: "Z–A" }]}
            value={sort}
            onChange={(v) => setSort(v as SortKey)}
          />
        </FilterSheet>
      </div>

      {/* Content */}
      <div className="px-5 pb-8 space-y-5 mt-2 relative z-10">
        {isLoading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-brand" /></div>
        ) : activeTab === "businesses" ? (
          <>
            {filteredBusinesses.length === 0 ? (
              <EmptyState icon={<Store className="h-12 w-12 text-[var(--text-muted)]" />} title="No businesses found" sub="Try a different search or category" />
            ) : (
              <>
                {!isFiltered && enrolledBusinesses.length > 0 && (
                  <section>
                    <SectionHeader icon={<Star className="h-4 w-4 text-amber-500" />} label="Your Cards" count={enrolledBusinesses.length} />
                    <div className="space-y-2.5">{enrolledBusinesses.map((biz) => <BusinessCard key={biz.id} business={biz} enrolled card={myCards.find((c) => c.businessId === biz.id)} />)}</div>
                  </section>
                )}
                <section>
                  <SectionHeader icon={isFiltered ? <TrendingUp className="h-4 w-4 text-brand" /> : <Sparkles className="h-4 w-4 text-brand" />}
                    label={isFiltered ? `${filteredBusinesses.length} result${filteredBusinesses.length !== 1 ? "s" : ""}` : "Discover"}
                    count={isFiltered ? undefined : newBusinesses.length} />
                  <div className="space-y-2.5">
                    {(isFiltered ? filteredBusinesses : newBusinesses).map((biz) => (
                      <BusinessCard key={biz.id} business={biz} enrolled={enrolledBusinessIds.has(biz.id)} card={myCards.find((c) => c.businessId === biz.id)} />
                    ))}
                  </div>
                </section>
              </>
            )}
          </>
        ) : (
          /* Programs tab */
          <>
            {filteredPrograms.length === 0 ? (
              <EmptyState icon={<Gift className="h-12 w-12 text-[var(--text-muted)]" />}
                title={search ? "No programs match your search" : "No programs found"}
                sub={search ? `Try searching "free coffee", "50% off", "reward"…` : "No active programs in this category"} />
            ) : (
              <section>
                <SectionHeader icon={<Gift className="h-4 w-4 text-brand" />}
                  label={isFiltered ? `${filteredPrograms.length} program${filteredPrograms.length !== 1 ? "s" : ""}` : "All Programs"}
                  count={isFiltered ? undefined : filteredPrograms.length} />
                <div className="space-y-2.5">
                  {filteredPrograms.map((p) => (
                    <ProgramCard key={`${p.businessId}-${p.id}`} program={p} enrolled={enrolledBusinessIds.has(p.businessId)} card={myCards.find((c) => c.businessId === p.businessId)} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Local wrapper keeps the explore page's compact inline styling
// while reusing the shared EmptyState primitive.
function EmptyState({ icon, title, sub }: { icon: React.ReactNode; title: string; sub: string }) {
  return (
    <SharedEmptyState
      icon={icon}
      title={title}
      description={sub}
      className="border-none bg-transparent py-16"
    />
  );
}

function SectionHeader({ icon, label, count }: { icon: React.ReactNode; label: string; count?: number }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      {icon}
      <p className="text-sm font-bold text-[var(--text-primary)]">{label}</p>
      {count !== undefined && <span className="text-xs text-[var(--text-tertiary)] bg-[var(--border-light)] px-2 py-0.5 rounded-full ml-auto">{count}</span>}
    </div>
  );
}

function BusinessCard({ business, enrolled, card }: { business: Business; enrolled: boolean; card?: LoyaltyCard }) {
  const program = business.loyaltyPrograms?.[0] ?? business.loyaltyProgram;
  const stamps = card?.totalStamps ?? 0;
  const required = program?.stampsRequired ?? 0;
  const rewardReady = enrolled && required > 0 && stamps >= required;
  const progress = required > 0 ? Math.min((stamps / required) * 100, 100) : 0;

  return (
    <Link href={`/dashboard/explore/${business.id}`} className="block group">
      <div className={`relative border p-5 bg-[var(--surface)] transition-colors duration-200 ${
        rewardReady
          ? "border-accent"
          : enrolled
            ? "border-[var(--text-primary)]"
            : "border-[var(--border)] hover:border-[var(--text-secondary)]"
      }`}>
        {enrolled && (
          <CheckCircle aria-hidden className="absolute top-4 right-4 h-4 w-4 text-[var(--text-primary)]" />
        )}
        <div className="flex items-center gap-4">
          {/* Logo */}
          <div className="h-16 w-16 shrink-0 border border-[var(--border)] flex items-center justify-center overflow-hidden">
            {business.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={business.logoUrl} alt={business.name} className="w-full h-full object-cover grayscale opacity-80 group-hover:opacity-100 transition-opacity" />
            ) : (
              <Store className="h-6 w-6 text-brand" strokeWidth={1.5} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2
              className="font-bold uppercase tracking-tight truncate text-[var(--text-primary)] mb-0.5"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              {business.name}
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mb-1.5">{business.category}</p>
            <div className="flex items-center gap-1.5 text-[var(--text-tertiary)]">
              <MapPin className="h-3.5 w-3.5 flex-shrink-0" strokeWidth={1.5} />
              <span className="text-xs truncate">{business.location ?? "—"}</span>
            </div>
          </div>
        </div>
        {program && (
          <p className="mt-3 pt-3 border-t border-[var(--border)] text-xs text-[var(--text-secondary)] truncate">
            {program.stampsRequired} stamps → {program.rewardDescription}
          </p>
        )}
        {enrolled && required > 0 && (
          <div className="mt-3 pt-3 border-t border-[var(--border)]">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] tracking-[0.15em] uppercase font-bold text-[var(--text-tertiary)]">{stamps}/{required} stamps</span>
              {rewardReady && <span className="text-[10px] font-bold text-accent-text">Ready!</span>}
            </div>
            <div className="h-1 w-full bg-[var(--border-light)] overflow-hidden">
              <div className={`h-full ${rewardReady ? "bg-accent" : "bg-brand"}`} style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}

function ProgramCard({ program, enrolled, card }: { program: ProgramWithBiz; enrolled: boolean; card?: LoyaltyCard }) {
  const stamps = card?.totalStamps ?? 0;
  const rewardReady = enrolled && stamps >= program.stampsRequired;
  const progress = Math.min((stamps / program.stampsRequired) * 100, 100);

  return (
    <Link href={`/dashboard/explore/${program.businessId}`} className="block group">
      <div className={`relative border p-5 bg-[var(--surface)] transition-colors duration-200 ${
        rewardReady ? "border-accent" : "border-[var(--border)] hover:border-[var(--text-secondary)]"
      }`}>
        {enrolled && (
          <CheckCircle aria-hidden className="absolute top-4 right-4 h-4 w-4 text-[var(--text-primary)]" />
        )}
        <div className="flex items-center gap-4">
          {/* Business logo */}
          <div className="h-14 w-14 shrink-0 border border-[var(--border)] flex items-center justify-center overflow-hidden">
            {program.businessLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={program.businessLogoUrl} alt={program.businessName} className="w-full h-full object-cover grayscale opacity-80 group-hover:opacity-100 transition-opacity" />
            ) : (
              <Store className="h-5 w-5 text-brand" strokeWidth={1.5} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] tracking-[0.15em] uppercase font-bold text-[var(--text-tertiary)] truncate">{program.businessName}</p>
            <p
              className="font-bold text-sm leading-tight truncate text-[var(--text-primary)] mt-0.5"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              {program.name}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[10px] tracking-[0.15em] uppercase font-bold border border-[var(--border)] px-2 py-0.5 text-brand flex-shrink-0">
                {program.stampsRequired} stamps
              </span>
              <span className="text-xs text-[var(--text-secondary)] truncate">{program.rewardDescription}</span>
            </div>
          </div>
        </div>
        {enrolled && (
          <div className="mt-3 pt-3 border-t border-[var(--border)]">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] tracking-[0.15em] uppercase font-bold text-[var(--text-tertiary)]">{stamps}/{program.stampsRequired} stamps collected</span>
              {rewardReady && <span className="text-[10px] font-bold text-accent-text">Ready to claim!</span>}
            </div>
            <div className="h-1 w-full bg-[var(--border-light)] overflow-hidden">
              <div className={`h-full ${rewardReady ? "bg-accent" : "bg-brand"}`} style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}
