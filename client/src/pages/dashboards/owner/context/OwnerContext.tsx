import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { adminApi, moviesApi } from "../../../../services/api/index.js";
import { PAGE_SIZE } from "../../../../constants/pagination.js";

interface OwnerContextType {
  theatres: any[];
  screens: any[];
  movies: any[];
  selectedTheatreId: string;
  selectedScreenId: string;
  setSelectedTheatreId: (id: string) => void;
  setSelectedScreenId: (id: string) => void;
  loading: boolean;
  isSearchingTheatres: boolean;
  isSearchingMovies: boolean;
  refreshScreens: (theatreId: string) => Promise<void>;
  searchTheatres: (query: string) => Promise<void>;
  searchMovies: (query: string) => Promise<void>;
}

const OwnerContext = createContext<OwnerContextType | undefined>(undefined);

export const OwnerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theatres, setTheatres] = useState<any[]>([]);
  const [screens, setScreens] = useState<any[]>([]);
  const [movies, setMovies] = useState<any[]>([]);
  const [selectedTheatreId, setSelectedTheatreId] = useState("");
  const [selectedScreenId, setSelectedScreenId] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSearchingTheatres, setIsSearchingTheatres] = useState(false);
  const [isSearchingMovies, setIsSearchingMovies] = useState(false);

  const init = async () => {
    try {
      setLoading(true);
      const theatreRes = await adminApi.listTheatres();
      setTheatres(theatreRes.theatres);
      const first = theatreRes.theatres[0];
      if (first) {
        setSelectedTheatreId(first._id);
      }
    } catch (error) {
      console.error("Owner initialization failed", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    init();
  }, []);

  const searchTheatres = useCallback(async (q: string) => {
    try {
      setIsSearchingTheatres(true);
      const res = await adminApi.listTheatres({ q });
      setTheatres(res.theatres);
    } catch (error) {
      console.error("Theatre search failed", error);
    } finally {
      setIsSearchingTheatres(false);
    }
  }, []);

  const searchMovies = useCallback(async (q: string) => {
    try {
      setIsSearchingMovies(true);
      const res = await moviesApi.list({ q, minimal: true, limit: PAGE_SIZE.MOVIES });
      setMovies(res.movies);
    } catch (error) {
      console.error("Movie search failed", error);
    } finally {
      setIsSearchingMovies(false);
    }
  }, []);

  const refreshScreens = async (theatreId: string) => {
    if (!theatreId) {
      setScreens([]);
      setSelectedScreenId("");
      return;
    }
    try {
      const res = await adminApi.listScreens(theatreId);
      setScreens(res.screens);
      const firstScreen = res.screens[0];
      if (firstScreen) {
        setSelectedScreenId(firstScreen._id);
      } else {
        setSelectedScreenId("");
      }
    } catch (error) {
      console.error("Failed to refresh screens", error);
    }
  };

  useEffect(() => {
    if (selectedTheatreId) {
       refreshScreens(selectedTheatreId);
    }
  }, [selectedTheatreId]);

  return (
    <OwnerContext.Provider value={{ 
      theatres, screens, movies, 
      selectedTheatreId, selectedScreenId, 
      setSelectedTheatreId, setSelectedScreenId, 
      loading, isSearchingTheatres, isSearchingMovies,
      refreshScreens, searchTheatres, searchMovies
    }}>
      {children}
    </OwnerContext.Provider>
  );
};

export const useOwner = () => {
  const context = useContext(OwnerContext);
  if (!context) throw new Error("useOwner must be used within OwnerProvider");
  return context;
};
