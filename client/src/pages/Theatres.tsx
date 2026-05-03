import { useEffect } from 'react';
import { MapPin } from 'lucide-react';
import { useTheatresStore } from '../store/browseStore.js';
import { useBookingStore } from '../store/bookingStore.js';
import { SEO } from '../components/common/SEO.js';
import { PAGE_META } from '../constants/seo.constants.js';
import { BrowseLayout } from '../components/layout/BrowseLayout.js';
import { FilterBar } from '../components/browse/FilterBar.js';
import { TheatreCard } from '../components/browse/TheatreCard.js';
import { PaginationBar } from '../components/browse/PaginationBar.js';

export const Theatres = () => {
  const { theatres, filters, page, pagination, loading, setFilters, setPage, resetFilters, fetch } =
    useTheatresStore();
  const { selectedCity } = useBookingStore();

  // Re-fetch when city (navbar), local search, or page changes
  useEffect(() => { fetch(selectedCity); }, [selectedCity, filters, page]);

  const emptyMessage = selectedCity
    ? `No cinemas found in ${selectedCity}.`
    : 'No cinemas found.';

  return (
    <>
      <SEO 
        title={PAGE_META.CINEMAS.TITLE} 
        description={PAGE_META.CINEMAS.DESCRIPTION} 
      />
    <BrowseLayout
      title="Find"
      titleHighlight="Cinemas"
      subtitle="Find premium cinemas and boutique theaters near you."
      accentColor="blue"
      loading={loading}
      isEmpty={!loading && theatres.length === 0}
      emptyMessage={emptyMessage}
      onReset={resetFilters}
      skeletonCount={4}
      skeletonClassName="h-64 rounded-[60px]"
      filterBar={
        <FilterBar
          searchValue={filters.search}
          onSearchChange={(v) => setFilters({ search: v })}
          searchPlaceholder="Search by theatre name or brand..."
          right={
            selectedCity ? (
              <div className="flex items-center gap-3 bg-white/5 px-5 py-3 rounded-2xl border border-white/5 whitespace-nowrap">
                <MapPin size={16} className="text-accent-pink" />
                <span className="text-[10px] font-black uppercase tracking-widest text-white">
                  {selectedCity}
                </span>
              </div>
            ) : undefined
          }
        />
      }
      pagination={
        pagination && pagination.totalPages > 1 ? (
          <PaginationBar pagination={pagination} onChange={setPage} />
        ) : undefined
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {theatres.map((theatre) => (
          <TheatreCard key={theatre._id} theatre={theatre} />
        ))}
      </div>
    </BrowseLayout>
    </>
  );
};
