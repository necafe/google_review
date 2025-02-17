import { useQuery } from "@tanstack/react-query";
import { Star, Loader } from "lucide-react";
import { motion } from "framer-motion";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useState, useEffect, useRef } from "react";
import { useToast } from "@/components/ui/use-toast";

interface GoogleReview {
  author_name: string;
  rating: number;
  text: string;
  time: number;
  profile_photo_url: string;
}

declare global {
  interface Window {
    google: any;
    initMap: () => void;
  }
}

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

const GoogleReviews = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 2;
  const { toast } = useToast();
  const mapRef = useRef<HTMLDivElement>(null);
  const [apiLoaded, setApiLoaded] = useState(false);

  useEffect(() => {
    // Create map element
    if (!mapRef.current) {
      const div = document.createElement('div');
      div.style.display = 'none';
      document.body.appendChild(div);
      mapRef.current = div;
    }

    // Load Google Maps API
    if (!window.google) {
      window.initMap = () => {
        console.log('Google Maps API loaded');
        setApiLoaded(true);
      };

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&callback=initMap`;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);

      console.log('Google Maps API script added to document head');

      return () => {
        document.head.removeChild(script);
        console.log('Google Maps API script removed from document head');
      };
    } else {
      console.log('Google Maps API already loaded');
      setApiLoaded(true);
    }
  }, []);

  const { data: reviews, isLoading, error } = useQuery({
    queryKey: ['google-reviews'],
    queryFn: async () => {
      if (!apiLoaded) {
        throw new Error('Google Maps API not loaded yet');
      }

      if (!GOOGLE_MAPS_API_KEY) {
        throw new Error('Google Maps API key is not configured');
      }

      return new Promise<GoogleReview[]>((resolve, reject) => {
        const mapElement = mapRef.current;
        if (!mapElement) {
          reject(new Error('Map element not found'));
          return;
        }

        try {
          const map = new window.google.maps.Map(mapElement, {
            center: { lat: -34.397, lng: 150.644 },
            zoom: 8,
          });

          const service = new window.google.maps.places.PlacesService(map);
          service.getDetails(
            {
              placeId: 'ChIJFSxCz9b5hlQRnkUWoJqgyW0',
              fields: ['reviews']
            },
            (place: any, status: any) => {
              console.log('Places API response:', { status, place });
              if (status === window.google.maps.places.PlacesServiceStatus.OK) {
                if (place.reviews && place.reviews.length > 0) {
                  resolve(place.reviews);
                } else {
                  reject(new Error('No reviews found for this place'));
                }
              } else {
                console.error('Places API error:', status);
                reject(new Error(`Failed to fetch reviews: ${status}`));
              }
            }
          );
        } catch (err) {
          console.error('Error initializing Places service:', err);
          reject(err);
        }
      });
    },
    enabled: apiLoaded,
    staleTime: 5 * 60 * 1000,
    retry: 1,
    retryDelay: 1000,
    meta: {
      onError: (error: Error) => {
        console.error('Query error:', error);
        toast({
          title: "Error",
          description: "Failed to load reviews. Please make sure your API key is valid and has the correct permissions.",
          variant: "destructive",
        });
      }
    }
  });

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        document.body.removeChild(mapRef.current);
      }
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader className="w-8 h-8 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Loading reviews...</p>
        <p className="text-sm text-muted-foreground mt-2">This might take a few moments</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500 mb-2">Error loading reviews.</p>
        <p className="text-sm text-muted-foreground">
          Please check your API key configuration and try again.
        </p>
      </div>
    );
  }

  if (!reviews || reviews.length === 0) {
    return <div className="text-center py-8">No reviews available.</div>;
  }

  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentReviews = reviews.slice(startIndex, startIndex + itemsPerPage);
  const totalPages = Math.ceil(reviews.length / itemsPerPage);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div>      
      <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {currentReviews?.map((review, index) => (
          <motion.div 
            key={review.time}
            className="p-8 bg-white rounded-xl shadow-sm border border-gray-100 backdrop-blur-sm bg-opacity-90"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: index * 0.2 }}
          >
            <div className="flex items-center mb-4">
              <div className="flex text-yellow-400 mr-2">
                {[...Array(review.rating)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 fill-current" />
                ))}
              </div>
              <span className="text-gray-600">Verified Review</span>
            </div>
            <p className="text-gray-700 mb-4">
              {review.text}
            </p>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-900 text-lg">{review.author_name}</p>
                <p className="text-sm text-gray-500">Verified Customer</p>
              </div>
              <div className="w-12 h-12 rounded-full overflow-hidden">
                <img 
                  src={review.profile_photo_url} 
                  alt={`${review.author_name}'s profile`}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-8 flex justify-center">
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious 
                onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
            {[...Array(totalPages)].map((_, index) => (
              <PaginationItem key={index}>
                <PaginationLink
                  onClick={() => handlePageChange(index + 1)}
                  isActive={currentPage === index + 1}
                >
                  {index + 1}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext 
                onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  );
};

export default GoogleReviews;
