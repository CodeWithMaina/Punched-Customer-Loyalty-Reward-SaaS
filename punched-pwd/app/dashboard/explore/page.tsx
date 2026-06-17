"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { businessesApi } from "@/lib/api/businesses";
import { loyaltyApi } from "@/lib/api/loyalty";
import type { Business, LoyaltyCard, LoyaltyProgram } from "@/types";
import {
  Search, MapPin, Loader2, Store, ChevronRight, Sparkles, Star,
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
    <div className="max-w-lg mx-auto">
      {/* Sticky search + tabs */}
      <div className="sticky top-[57px] z-10 bg-[var(--background)] px-4 pt-4 pb-3 space-y-3">
        {/* Search */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]" />
            <input type="text" placeholder="Search businesses, rewards, free food…"
              value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-2xl text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-brand shadow-card" />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <button onClick={() => setShowFilters((v) => !v)}
            className={`h-10 w-10 rounded-2xl border flex items-center justify-center flex-shrink-0 transition-all ${showFilters ? "bg-brand border-brand text-white shadow-sm" : "bg-[var(--surface)] border-[var(--border)] text-[var(--text-secondary)]"}`}>
            <SlidersHorizontal className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-[var(--border-light)] rounded-2xl p-1">
          {(["businesses", "programs"] as TabType[]).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 rounded-xl text-xs font-bold capitalize transition-all ${activeTab === tab ? "bg-[var(--surface)] text-[var(--text-primary)] shadow-sm" : "text-[var(--text-tertiary)]"}`}>
              {tab === "businesses" ? `Businesses ${isFiltered ? `(${filteredBusinesses.length})` : ""}` : `Programs ${isFiltered ? `(${filteredPrograms.length})` : ""}`}
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
      <div className="px-4">
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
      <div className="px-4 pb-8 space-y-5 mt-2">
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

function EmptyState({ icon, title, sub }: { icon: React.ReactNode; title: string; sub: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 space-y-3 text-center animate-fade-in">
      {icon}<p className="text-[var(--text-secondary)] font-medium">{title}</p><p className="text-[var(--text-tertiary)] text-sm">{sub}</p>
    </div>
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
    <Link href={`/dashboard/explore/${business.id}`}>
      <div className={`bg-[var(--surface)] rounded-2xl border shadow-card p-4 hover:shadow-card-hover transition-all active:scale-[0.99] ${rewardReady ? "border-accent" : "border-[var(--border-light)]"}`}>
        <div className="flex items-start gap-3">
          <div className="h-14 w-14 rounded-xl bg-brand-surface flex items-center justify-center overflow-hidden flex-shrink-0 border border-brand/10">
            {business.logoUrl ? <img src={business.logoUrl} alt={business.name} className="h-full w-full object-cover" /> : <Store className="h-6 w-6 text-brand" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className="font-bold text-[var(--text-primary)] text-sm leading-tight truncate">{business.name}</p>
              {enrolled && <CheckCircle className="h-4 w-4 text-brand flex-shrink-0 mt-0.5" />}
            </div>
            <p className="text-xs text-[var(--text-tertiary)] mt-0.5">{business.category}</p>
            {business.location && <div className="flex items-center gap-1 mt-0.5"><MapPin className="h-3 w-3 text-[var(--text-muted)]" /><span className="text-[10px] text-[var(--text-tertiary)] truncate">{business.location}</span></div>}
            {program && <p className="text-xs text-[var(--text-secondary)] mt-1 truncate">{program.stampsRequired} stamps → {program.rewardDescription}</p>}
          </div>
          <ChevronRight className="h-4 w-4 text-[var(--text-muted)] flex-shrink-0 mt-1" />
        </div>
        {enrolled && required > 0 && (
          <div className="mt-3 pt-3 border-t border-[var(--border-light)]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-[var(--text-tertiary)]">{stamps}/{required} stamps</span>
              {rewardReady && <span className="text-[10px] font-bold text-accent-text">Ready!</span>}
            </div>
            <div className="h-1.5 bg-[var(--border-light)] rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${rewardReady ? "bg-accent" : "bg-brand"}`} style={{ width: `${progress}%` }} />
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
    <Link href={`/dashboard/explore/${program.businessId}`}>
      <div className={`bg-[var(--surface)] rounded-2xl border shadow-card p-4 hover:shadow-card-hover transition-all active:scale-[0.99] ${rewardReady ? "border-accent" : "border-[var(--border-light)]"}`}>
        <div className="flex items-start gap-3">
          {/* Business logo */}
          <div className="h-12 w-12 rounded-xl bg-brand-surface flex items-center justify-center overflow-hidden flex-shrink-0 border border-brand/10">
            {program.businessLogoUrl ? <img src={program.businessLogoUrl} alt={program.businessName} className="h-full w-full object-cover" /> : <Store className="h-5 w-5 text-brand" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs text-[var(--text-tertiary)] truncate">{program.businessName}</p>
                <p className="font-bold text-[var(--text-primary)] text-sm leading-tight truncate">{program.name}</p>
              </div>
              {enrolled && <CheckCircle className="h-4 w-4 text-brand flex-shrink-0 mt-0.5" />}
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              <div className="flex items-center gap-1 bg-brand-surface rounded-full px-2 py-0.5">
                <Gift className="h-3 w-3 text-brand" />
                <span className="text-[10px] font-bold text-brand">{program.stampsRequired} stamps</span>
              </div>
              <span className="text-xs text-[var(--text-secondary)] truncate">{program.rewardDescription}</span>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-[var(--text-muted)] flex-shrink-0 mt-1" />
        </div>
        {enrolled && (
          <div className="mt-3 pt-3 border-t border-[var(--border-light)]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-[var(--text-tertiary)]">{stamps}/{program.stampsRequired} stamps collected</span>
              {rewardReady && <span className="text-[10px] font-bold text-accent-text">Ready to claim!</span>}
            </div>
            <div className="h-1.5 bg-[var(--border-light)] rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${rewardReady ? "bg-accent" : "bg-brand"}`} style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}
