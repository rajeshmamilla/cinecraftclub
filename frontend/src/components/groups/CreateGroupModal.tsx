import { useState, useEffect } from "react";
import { X, Search, Lock, Globe } from "lucide-react";
import { searchMulti, getImageUrl } from "../../services/tmdb";
import type { Movie } from "../../services/tmdb";

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (groupId: number) => void;
}

const CRAFTS = [
  "General Discussion",
  "Direction",
  "Screenplay & Writing",
  "Cinematography",
  "Acting",
  "Editing",
  "VFX & Animation",
  "Music & Sound",
  "Production Design",
  "Action & Stunts",
];

export default function CreateGroupModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateGroupModalProps) {
  const [step, setStep] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    isPrivate: false,
  });

  const [selectedFocuses, setSelectedFocuses] = useState<string[]>([
    "General Discussion",
  ]);
  const [focusInput, setFocusInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.length >= 2) {
        setIsSearching(true);
        const results = await searchMulti(searchQuery);
        setSearchResults(results.slice(0, 5));
        setIsSearching(false);
      } else {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  if (!isOpen) return null;

  const handleAddCustomFocus = () => {
    const trimmed = focusInput.trim();
    if (trimmed && !selectedFocuses.includes(trimmed)) {
      setSelectedFocuses((prev) => [...prev, trimmed]);
      setFocusInput("");
      setShowSuggestions(false);
    }
  };

  const handleCreate = async () => {
    if (!selectedMovie || !formData.name) return;

    setIsLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("jwtToken");
      const response = await fetch("http://localhost:8080/api/groups", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formData.name,
          focus: selectedFocuses.join(", "),
          keywords: "",
          description: formData.description,
          isPrivate: formData.isPrivate,
          movieId: selectedMovie.id,
          movieTitle: selectedMovie.title || selectedMovie.name,
          moviePoster: selectedMovie.backdrop_path || selectedMovie.poster_path,
        }),
      });

      if (response.ok) {
        const group = await response.json();
        onSuccess(group.id);
        onClose();
      } else {
        setError("Failed to create group. Please try again.");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-lg bg-background border border-border rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-bold">Create New Group</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-secondary rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {step === 1 ? (
            <div className="space-y-4">
              <label className="text-sm font-medium text-muted-foreground">
                First, select a movie or show
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search for a movie..."
                  className="w-full bg-secondary/50 border border-border focus:border-primary focus:outline-none pl-10 pr-4 py-3 rounded-xl transition-colors"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {isSearching ? (
                  <div className="p-4 text-center text-muted-foreground animate-pulse text-sm">
                    Searching...
                  </div>
                ) : (
                  searchResults.map((movie) => (
                    <button
                      key={movie.id}
                      onClick={() => {
                        setSelectedMovie(movie);
                        setStep(2);
                        setFormData((prev) => ({
                          ...prev,
                          name: `${movie.title || movie.name} Discussion`,
                        }));
                      }}
                      className="w-full flex items-center space-x-3 p-2 hover:bg-secondary rounded-lg transition-colors text-left"
                    >
                      <img
                        src={getImageUrl(movie.poster_path, "w185")}
                        alt=""
                        className="w-10 h-14 object-cover rounded"
                      />
                      <div>
                        <div className="font-medium text-sm">
                          {movie.title || movie.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {movie.release_date?.split("-")[0] ||
                            movie.first_air_date?.split("-")[0]}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
              <div className="flex items-center space-x-3 p-3 bg-secondary/30 rounded-xl border border-border mb-4">
                <img
                  src={getImageUrl(selectedMovie?.poster_path || null, "w185")}
                  alt=""
                  className="w-12 h-16 object-cover rounded"
                />
                <div className="flex-1">
                  <div className="text-xs text-muted-foreground mb-1">
                    Selected Movie
                  </div>
                  <div className="font-bold text-sm">
                    {selectedMovie?.title || selectedMovie?.name}
                  </div>
                </div>
                <button
                  onClick={() => setStep(1)}
                  className="text-xs text-primary hover:underline"
                >
                  Change
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Group Name</label>
                  <input
                    type="text"
                    className="w-full bg-secondary/50 border border-border focus:border-primary focus:outline-none px-4 py-2 rounded-lg"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Topic</label>

                  {/* Selected Tags Display */}
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {selectedFocuses.map((focus) => (
                      <span
                        key={focus}
                        className="flex items-center space-x-1 text-xs bg-primary/20 text-primary px-2.5 py-1 rounded-full font-bold"
                      >
                        <span>{focus}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedFocuses((prev) =>
                              prev.filter((f) => f !== focus),
                            )
                          }
                          className="hover:text-red-500 rounded-full transition-colors ml-1 focus:outline-none"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                    {selectedFocuses.length === 0 && (
                      <span className="text-xs text-muted-foreground italic">
                        No focus area selected
                      </span>
                    )}
                  </div>

                  {/* Input with Auto-suggestions */}
                  <div className="relative">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Type a focus craft or search suggestions..."
                        className="flex-1 bg-secondary/50 border border-border focus:border-primary focus:outline-none px-3 py-2 rounded-lg text-sm transition-colors"
                        value={focusInput}
                        onChange={(e) => {
                          setFocusInput(e.target.value);
                          setShowSuggestions(true);
                        }}
                        onFocus={() => setShowSuggestions(true)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddCustomFocus();
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleAddCustomFocus}
                        className="px-4 py-2 bg-secondary hover:bg-secondary/80 text-foreground border border-border rounded-lg text-sm font-semibold transition-colors"
                      >
                        Add
                      </button>
                    </div>

                    {showSuggestions && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setShowSuggestions(false)}
                        />
                        <div className="absolute left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-background border border-border rounded-lg shadow-xl z-20 divide-y divide-border/50">
                          {CRAFTS.filter(
                            (c) =>
                              !selectedFocuses.includes(c) &&
                              c
                                .toLowerCase()
                                .includes(focusInput.toLowerCase()),
                          ).map((craft) => (
                            <button
                              key={craft}
                              type="button"
                              onClick={() => {
                                setSelectedFocuses((prev) => [...prev, craft]);
                                setFocusInput("");
                                setShowSuggestions(false);
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-secondary/80 text-sm transition-colors text-foreground"
                            >
                              {craft}
                            </button>
                          ))}
                          {CRAFTS.filter(
                            (c) =>
                              !selectedFocuses.includes(c) &&
                              c
                                .toLowerCase()
                                .includes(focusInput.toLowerCase()),
                          ).length === 0 &&
                            focusInput.trim() && (
                              <div className="px-4 py-2 text-xs text-muted-foreground italic">
                                Press Enter or click "Add" to insert "
                                {focusInput}"
                              </div>
                            )}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <textarea
                    rows={3}
                    className="w-full bg-secondary/50 border border-border focus:border-primary focus:outline-none px-4 py-2 rounded-lg resize-none"
                    placeholder="What will this group discuss?"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg border border-border">
                  <div className="flex items-center space-x-2">
                    {formData.isPrivate ? (
                      <Lock className="w-4 h-4 text-yellow-500" />
                    ) : (
                      <Globe className="w-4 h-4 text-blue-500" />
                    )}
                    <span className="text-sm font-medium">
                      {formData.isPrivate ? "Private Group" : "Public Group"}
                    </span>
                  </div>
                  <button
                    onClick={() =>
                      setFormData({
                        ...formData,
                        isPrivate: !formData.isPrivate,
                      })
                    }
                    className={`relative w-11 h-6 rounded-full transition-colors ${formData.isPrivate ? "bg-primary" : "bg-muted"}`}
                  >
                    <div
                      className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${formData.isPrivate ? "translate-x-5" : ""}`}
                    />
                  </button>
                </div>
              </div>

              {error && (
                <div className="text-red-500 text-xs text-center">{error}</div>
              )}

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 px-6 py-3 border border-border rounded-xl font-medium hover:bg-secondary transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleCreate}
                  disabled={
                    isLoading || !formData.name || selectedFocuses.length === 0
                  }
                  className="flex-[2] px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-all disabled:opacity-50"
                >
                  {isLoading ? "Creating..." : "Create Group"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
