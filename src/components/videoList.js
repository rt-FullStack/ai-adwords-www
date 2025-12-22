'use client';
import { useState } from 'react';

const VideoList = ({ videos }) => {
  const [errors, setErrors] = useState({});

  const handleError = (id) => {
    setErrors((prev) => ({ ...prev, [id]: true }));
  };

  const getEmbedUrl = (id, type) => {
    if (type === 'youtube') return `https://www.youtube.com/embed/${id}`;
    return null;
  };

  return (
    <div className="grid grid-cols-1 gap-10">
      {videos.map((video, i) => {
        const embedUrl = getEmbedUrl(video.id, video.type);

        return (
          <div key={i} className="flex flex-col gap-6">
            <div>
              <h3 className="text-xl font-semibold pt-6 pb-2">{video.title}</h3>
              <p className="text-gray-600 pb-2">{video.description}</p>
            </div>

            <div className="aspect-video bg-gray-200 rounded shadow-md">
              {!errors[video.id] && embedUrl ? (
                <iframe
                  className="w-full h-full rounded"
                  src={embedUrl}
                  title={video.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  onError={() => handleError(video.id)}
                />
              ) : (
                <div className="flex flex-col justify-center items-center h-full text-center p-4">
                  <p className="text-sm text-red-600 font-semibold mb-2">
                    Couldn't load video. You can view it directly on YouTube:
                  </p>
                  <a
                    href={`https://www.youtube.com/watch?v=${video.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline break-words"
                  >
                    https://www.youtube.com/watch?v={video.id}
                  </a>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default VideoList;