import { useState } from "react";

export default function RatingStars({ label, onSubmit }: { label: string; onSubmit: (rating: number) => void }) {
  const [rating, setRating] = useState(0);

  const handleStarClick = (index: number) => {
    setRating(index + 1);
  };

  return (
    <div className="flex flex-col items-center">
      <p>{label}</p>
      <div className="flex">
        {[...Array(5)].map((_, index) => (
          <span
            key={index}
            onClick={() => handleStarClick(index)}
            style={{
              cursor: "pointer",
              color: index < rating ? "yellow" : "gray",
              fontSize: "3em",
            }}
          >
            ★
          </span>
        ))}
      </div>
      <button
        onClick={() => onSubmit(rating)}
        className="bg-gradient-to-tr from-indigo-500 to-indigo-300 text-white rounded-lg px-4 py-2 hover:bg-blue-600"
      >
        Submit
      </button>
    </div>
  );
} 