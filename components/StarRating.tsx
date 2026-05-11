import { useState } from 'react';
import { Icons } from './Icon';

interface StarRatingProps {
  rating: number;
  onChange?: (rating: number) => void;
  readOnly?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

function StarRating({ rating, onChange, readOnly = false, size = 'md' }: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  const starSize = size === 'sm' ? 16 : size === 'md' ? 22 : 28;
  const currentRating = hoverRating !== null ? hoverRating : rating;
  const displayStars = 5;

  const handleClick = (index: number) => {
    if (readOnly || !onChange) return;
    onChange((index + 1) * 2);
  };

  const handleMouseEnter = (index: number) => {
    if (readOnly) return;
    setHoverRating((index + 1) * 2);
  };

  const handleMouseLeave = () => {
    if (readOnly) return;
    setHoverRating(null);
  };

  return (
    <div className="flex gap-0.5 items-center">
      {[...Array(displayStars)].map((_, index) => {
        const starValue = (index + 1) * 2;
        const isFilled = currentRating >= starValue;
        const isHalf = !isFilled && currentRating >= starValue - 1;

        return (
          <button
            key={index}
            type="button"
            disabled={readOnly}
            className={`transition-colors duration-150 ${readOnly ? 'cursor-default' : 'cursor-pointer'}`}
            onClick={() => handleClick(index)}
            onMouseEnter={() => handleMouseEnter(index)}
            onMouseLeave={handleMouseLeave}
          >
            <Icons.Star
              size={starSize}
              className={`${
                isFilled
                  ? 'fill-orange text-orange'
                  : isHalf
                  ? 'fill-orange/50 text-orange'
                  : 'text-text-tertiary'
              }`}
            />
          </button>
        );
      })}
      {!readOnly && (
        <span className="ml-1.5 text-sm text-text-secondary font-medium w-6">
          {currentRating > 0 ? currentRating : '-'}
        </span>
      )}
    </div>
  );
}

export default StarRating;