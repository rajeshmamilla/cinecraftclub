import { useState, useEffect, useRef } from 'react';
import { Star, X } from 'lucide-react';
import { toast } from 'sonner';
import { getValidToken } from '../../utils/auth';

interface RatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  movieId: number;
  mediaType?: string;
  movieTitle: string;
  posterPath?: string;
  /** Called after a successful submit so parent can update local rating state */
  onSuccess?: (rating: number) => void;
}

export default function RatingModal({
  isOpen,
  onClose,
  movieId,
  mediaType = 'movie',
  movieTitle,
  posterPath,
  onSuccess,
}: RatingModalProps) {
  const [hoveredStar, setHoveredStar] = useState(0);
  const [selectedStar, setSelectedStar] = useState(0);
  const [review, setReview] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingRatingId, setExistingRatingId] = useState<number | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Fetch existing rating for this movie on open
  useEffect(() => {
    if (!isOpen) return;
    const token = getValidToken();
    if (!token) return;
    const fetch_ = async () => {
      try {
        const res = await fetch(`http://localhost:8080/api/ratings/movie/${movieId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok && res.status !== 204) {
          const data = await res.json();
          setSelectedStar(data.rating ?? 0);
          setReview(data.review ?? '');
          setExistingRatingId(data.id ?? null);
        } else {
          setSelectedStar(0);
          setReview('');
          setExistingRatingId(null);
        }
      } catch (_) {}
    };
    fetch_();
  }, [isOpen, movieId]);

  const handleSubmit = async () => {
    const token = getValidToken();
    if (!token) {
      window.dispatchEvent(new Event('open-auth-modal'));
      return;
    }
    if (selectedStar === 0) {
      toast.error('Please select a star rating first.');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch('http://localhost:8080/api/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          movieId,
          mediaType,
          movieTitle,
          posterPath,
          rating: selectedStar,
          review: review.trim() || null,
        }),
      });
      if (res.ok) {
        toast.success(`Rated "${movieTitle}" ${selectedStar}/10 ⭐`);
        onSuccess?.(selectedStar);
        onClose();
      } else {
        toast.error('Failed to save rating. Please try again.');
      }
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to remove your rating?')) return;
    const token = getValidToken();
    if (!token) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`http://localhost:8080/api/ratings/movie/${movieId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success('Rating removed successfully.');
        onSuccess?.(0);
        onClose();
      } else {
        toast.error('Failed to remove rating.');
      }
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
    >
      <div className="relative bg-secondary/95 border border-border rounded-2xl shadow-2xl w-full max-w-md p-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors rounded-full"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="mb-6">
          <h3 className="text-2xl font-bold mb-1">Rate this Film</h3>
          <p className="text-sm text-muted-foreground line-clamp-1 font-medium">{movieTitle}</p>
          {existingRatingId && (
            <span className="inline-block mt-2 text-xs bg-primary/10 text-primary px-3 py-0.5 rounded-full font-semibold">
              Editing your existing rating
            </span>
          )}
        </div>

        {/* Star picker */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
              <button
                key={star}
                onMouseEnter={() => setHoveredStar(star)}
                onMouseLeave={() => setHoveredStar(0)}
                onClick={() => setSelectedStar(star)}
                className="p-0.5 focus:outline-none transition-transform hover:scale-110"
              >
                <Star
                  className={`w-6 h-6 transition-colors ${
                    (hoveredStar || selectedStar) >= star
                      ? 'text-yellow-400 fill-yellow-400'
                      : 'text-muted-foreground/50'
                  }`}
                />
              </button>
            ))}
          </div>
          <span className={`text-2xl font-bold ml-3 w-14 text-right tabular-nums ${selectedStar > 0 ? 'text-yellow-400' : 'text-muted-foreground/40'}`}>
            {selectedStar > 0 ? `${selectedStar}/10` : '-/10'}
          </span>
        </div>

        {/* Review textarea */}
        <div className="mb-6">
          <label className="text-sm font-semibold mb-2 block">Your Experience <span className="text-muted-foreground font-normal">(optional)</span></label>
          <textarea
            placeholder="Write your review here..."
            value={review}
            onChange={(e) => setReview(e.target.value)}
            rows={5}
            className="w-full bg-background/70 border border-border rounded-xl p-3 text-sm focus:outline-none focus:border-primary transition-colors resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || selectedStar === 0}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Star className={`w-4 h-4 ${selectedStar > 0 ? 'fill-current' : ''}`} />
            {isSubmitting ? 'Saving...' : existingRatingId ? 'Update Rating' : 'Submit Rating'}
          </button>
          
          {existingRatingId && (
            <button
              onClick={handleDelete}
              disabled={isSubmitting}
              className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold py-2.5 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm border border-red-500/20"
            >
              Remove Rating
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
