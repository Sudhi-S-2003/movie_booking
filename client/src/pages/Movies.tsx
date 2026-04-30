import { useEffect } from 'react';
import { Filter } from 'lucide-react';
import { useMoviesStore } from '../store/browseStore.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { BrowseLayout } from '../components/layout/BrowseLayout.js';
import { FilterBar } from '../components/browse/FilterBar.js';
import { MovieCard } from '../components/browse/MovieCard.js';
import { PaginationBar } from '../components/browse/PaginationBar.js';

const GENRES = ['Action','Sci-Fi','Adventure','Drama','Crime','Fantasy','Animation','Romance','Thriller','Horror','Comedy','Biographical','Historical','Survival','Superhero','Sports','Musical','Dark Comedy','Folklore','Period'];

const STATUS_OPTIONS = [
  { value: 'now-showing', label: 'Now Showing' },
  { value: 'upcoming',    label: 'Coming Soon' },
  { value: 'archived',    label: 'Classics'    },
];

const GENRE_OPTIONS = [
  { value: '', label: 'All Genres' },
  ...GENRES.map((g) => ({ value: g, label: g })),
];

export const Movies = () => {
  useDocumentTitle('Browse Movies');
  const { movies, filters, page, pagination, loading, setFilters, setPage, resetFilters, fetch } =
    useMoviesStore();

  // Fetch whenever filters or page change
  useEffect(() => { fetch(); }, [filters, page]);

  return (
    <BrowseLayout
      title="Browse"
      titleHighlight="Movies"
      subtitle="Find films and showtimes near you."
      accentColor="pink"
      loading={loading}
      isEmpty={!loading && movies.length === 0}
      emptyMessage="No movies found."
      onReset={resetFilters}
      skeletonCount={10}
      skeletonClassName="aspect-[2/3] rounded-3xl"
      filterBar={
        <FilterBar
          searchValue={filters.search}
          onSearchChange={(v) => setFilters({ search: v })}
          searchPlaceholder="Search movies..."
          selects={[
            {
              value: filters.status,
              onChange: (v) => setFilters({ status: v }),
              options: STATUS_OPTIONS,
              accentClass: 'focus:border-accent-pink',
            },
            {
              value: filters.genre,
              onChange: (v) => setFilters({ genre: v }),
              options: GENRE_OPTIONS,
              accentClass: 'focus:border-accent-blue',
            },
          ]}
          right={
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                {pagination?.total ?? movies.length} results
              </span>
              <div className="h-4 w-px bg-white/10" />
              <button className="text-accent-pink hover:text-white transition-colors">
                <Filter size={17} />
              </button>
            </div>
          }
        />
      }
      pagination={
        pagination && pagination.totalPages > 1 ? (
          <PaginationBar pagination={pagination} onChange={setPage} />
        ) : undefined
      }
    >
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
        {movies.map((movie) => (
          <MovieCard key={movie._id} movie={movie} />
        ))}
      </div>
    </BrowseLayout>
  );
};
