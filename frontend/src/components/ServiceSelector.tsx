"use client";

import { useState, useRef, useEffect } from "react";
import { type ServiceCategory, type ShopService } from "@/lib/api";
import { ServiceButton } from "@/components/ServiceButton";

interface ServiceSelectorProps {
  categories: ServiceCategory[];
  onSelect: (categoryName: string, service?: ShopService) => void;
  selectedCategory?: string;
  selectedService?: string;
}

export function ServiceSelector({
  categories,
  onSelect,
  selectedCategory,
  selectedService,
}: ServiceSelectorProps) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(
    selectedCategory ?? null
  );
  const servicesRef = useRef<HTMLDivElement>(null);

  // Sync expanded category when selectedCategory changes externally
  useEffect(() => {
    if (selectedCategory) {
      setExpandedCategory(selectedCategory);
    }
  }, [selectedCategory]);

  const handleCategoryClick = (cat: ServiceCategory) => {
    const catName = cat.name;

    if (expandedCategory === catName) {
      // Toggle off if already expanded
      setExpandedCategory(null);
      return;
    }

    setExpandedCategory(catName);

    // If no sub-services, select category directly
    if (!cat.services || cat.services.length === 0) {
      onSelect(catName);
    }
  };

  const handleServiceClick = (catName: string, service: ShopService) => {
    onSelect(catName, service);
  };

  const activeCat = categories.find((c) => c.name === expandedCategory);

  return (
    <div>
      {/* Category tabs - horizontal scroll */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {categories.map((cat) => (
          <ServiceButton
            key={cat.id}
            label={cat.name}
            icon={cat.icon || ""}
            selected={selectedCategory === cat.name}
            onClick={() => handleCategoryClick(cat)}
          />
        ))}
      </div>

      {/* Sub-services - slide down */}
      <div
        ref={servicesRef}
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{
          maxHeight: activeCat && activeCat.services.length > 0 ? "300px" : "0px",
          opacity: activeCat && activeCat.services.length > 0 ? 1 : 0,
        }}
      >
        {activeCat && activeCat.services.length > 0 && (
          <div className="pt-3 flex flex-wrap gap-2">
            {activeCat.services.map((svc) => (
              <button
                key={svc.id}
                type="button"
                onClick={() => handleServiceClick(activeCat.name, svc)}
                className={`px-3 py-2 rounded-xl text-sm font-medium border transition-all active:scale-95 ${
                  selectedService === svc.name
                    ? "border-ring bg-muted text-foreground"
                    : "border-border bg-card text-muted-foreground hover:border-input"
                }`}
              >
                {svc.name}
                {svc.estimated_duration_minutes && (
                  <span className="ml-1 text-xs text-subtle">
                    {svc.estimated_duration_minutes}분
                  </span>
                )}
                {svc.price != null && (
                  <span className="ml-1 text-xs text-subtle">
                    {svc.price.toLocaleString()}원
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
